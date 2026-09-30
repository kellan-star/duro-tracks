#!/usr/bin/env node
/**
 * Weekly Avoma -> Google Drive transcript sync.
 *
 * Standalone: needs only Node 20+ (built-in fetch) and `googleapis`. No app,
 * no SQLite, no Railway. Intended to run from GitHub Actions on a schedule.
 *
 * For each meeting in a recent window it downloads the transcript (or notes as a
 * fallback) and uploads it to a Google Drive folder — grouped into a subfolder
 * per account domain — skipping anything already there so re-runs are cheap.
 *
 * Env:
 *   AVOMA_API_KEY                 (required) Avoma REST key
 *   GOOGLE_SERVICE_ACCOUNT_JSON   (required) service-account key JSON (raw or base64)
 *   GDRIVE_FOLDER_ID              (required) destination Drive folder id
 *   LOOKBACK_DAYS                 (optional) window to scan, default 14
 *   INTERNAL_DOMAINS             (optional) comma list of our own domains to ignore
 *                                 when guessing the account, default durolabs.co,altium.com
 */
import { google } from "googleapis";

const AVOMA_API_KEY = need("AVOMA_API_KEY");
const GDRIVE_FOLDER_ID = need("GDRIVE_FOLDER_ID");
const SA_RAW = need("GOOGLE_SERVICE_ACCOUNT_JSON");
const LOOKBACK_DAYS = parseInt(process.env.LOOKBACK_DAYS || "14", 10);
const INTERNAL_DOMAINS = (process.env.INTERNAL_DOMAINS || "durolabs.co,altium.com")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const PERSONAL_DOMAINS = new Set([
  "gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com",
  "me.com", "aol.com", "proton.me", "protonmail.com", "live.com",
]);

const AVOMA_BASE = "https://api.avoma.com";

function need(name) {
  const v = process.env[name];
  if (!v) { console.error(`Missing required env: ${name}`); process.exit(1); }
  return v;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Avoma REST (bearer auth, pagination, retry on 429/5xx) ------------------
async function avoma(path, params) {
  const url = new URL(path, AVOMA_BASE);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  for (let attempt = 0; attempt < 4; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { Authorization: `Bearer ${AVOMA_API_KEY}` } });
    } catch (e) {
      await sleep(Math.min(2000 * 2 ** attempt, 15000));
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      const ra = parseInt(res.headers.get("retry-after") || "0", 10);
      await sleep(ra > 0 ? ra * 1000 : Math.min(2000 * 2 ** attempt, 15000));
      continue;
    }
    if (res.status === 404) return { __notFound: true };
    if (!res.ok) throw new Error(`Avoma ${res.status} ${path}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  }
  throw new Error(`Avoma: retries exhausted for ${path}`);
}

async function fetchMeetings(fromISO, toISO) {
  const all = [];
  let page = 1;
  for (;;) {
    const res = await avoma("/v1/meetings/", {
      from_date: fromISO, to_date: toISO, page_size: "100", page: String(page),
    });
    for (const m of res.results || []) all.push(m);
    if (!res.next) break;
    page++;
  }
  return all;
}

async function fetchTranscript(uuid) {
  const res = await avoma("/v1/transcriptions/", { meeting_uuid: uuid });
  if (res.__notFound) return null;
  let text = "";
  if (Array.isArray(res.results)) text = res.results.map((t) => (typeof t.data === "string" ? t.data : "")).filter(Boolean).join("\n");
  else if (typeof res.data === "string") text = res.data;
  return text.trim() ? text : null;
}

async function fetchNotes(uuid, fromISO, toISO) {
  const res = await avoma("/v1/notes/", {
    meeting_uuid: uuid, output_format: "markdown", from_date: fromISO, to_date: toISO, page_size: "20",
  });
  if (res.__notFound || !Array.isArray(res.results) || res.results.length === 0) return null;
  const text = res.results.map((n) => (typeof n.data === "string" ? n.data : JSON.stringify(n.data))).filter(Boolean).join("\n\n");
  return text.trim() ? text : null;
}

function accountDomain(meeting) {
  const counts = new Map();
  for (const a of meeting.attendees || []) {
    const email = (a.email || "").toLowerCase();
    const dom = email.split("@")[1];
    if (!dom || INTERNAL_DOMAINS.includes(dom) || PERSONAL_DOMAINS.has(dom)) continue;
    counts.set(dom, (counts.get(dom) || 0) + 1);
  }
  let best = null, bestN = 0;
  for (const [dom, n] of counts) if (n > bestN) { best = dom; bestN = n; }
  return best;
}

// --- Google Drive ------------------------------------------------------------
function driveClient() {
  let creds;
  try { creds = JSON.parse(SA_RAW); }
  catch { creds = JSON.parse(Buffer.from(SA_RAW, "base64").toString("utf8")); }
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

const ALL = { supportsAllDrives: true, includeItemsFromAllDrives: true };
const folderCache = new Map();

async function ensureSubfolder(drive, parentId, name) {
  const key = `${parentId}/${name}`;
  if (folderCache.has(key)) return folderCache.get(key);
  const q = `'${parentId}' in parents and name = ${JSON.stringify(name)} and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const list = await drive.files.list({ q, fields: "files(id,name)", ...ALL });
  let id = list.data.files?.[0]?.id;
  if (!id) {
    const created = await drive.files.create({
      requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
      fields: "id", ...ALL,
    });
    id = created.data.id;
  }
  folderCache.set(key, id);
  return id;
}

async function fileExists(drive, parentId, name) {
  const q = `'${parentId}' in parents and name = ${JSON.stringify(name)} and trashed = false`;
  const list = await drive.files.list({ q, fields: "files(id)", ...ALL });
  return (list.data.files?.length || 0) > 0;
}

async function uploadText(drive, parentId, name, content) {
  await drive.files.create({
    requestBody: { name, parents: [parentId] },
    media: { mimeType: "text/plain", body: content },
    fields: "id", ...ALL,
  });
}

// --- Main --------------------------------------------------------------------
async function main() {
  const now = new Date();
  const from = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const fromISO = from.toISOString();
  const toISO = now.toISOString();

  console.log(`[avoma-drive] window ${fromISO} .. ${toISO} (last ${LOOKBACK_DAYS} days)`);
  const drive = driveClient();

  const meetings = await fetchMeetings(fromISO, toISO);
  console.log(`[avoma-drive] ${meetings.length} meetings in window`);

  let uploaded = 0, skipped = 0, noContent = 0;
  for (const m of meetings) {
    const uuid = m.uuid;
    if (!uuid) continue;

    const domain = accountDomain(m) || "_ungrouped";
    const subId = await ensureSubfolder(drive, GDRIVE_FOLDER_ID, domain);

    let content = await fetchTranscript(uuid);
    let suffix = "";
    if (!content) {
      content = await fetchNotes(uuid, fromISO, toISO);
      suffix = ".notes";
    }
    if (!content) { noContent++; continue; }

    const name = `${uuid}${suffix}.txt`;
    if (await fileExists(drive, subId, name)) { skipped++; continue; }

    const header =
      `Account domain: ${domain}\n` +
      `Meeting: ${m.subject || "(no subject)"}\n` +
      `Meeting UUID: ${uuid}\n` +
      `Date: ${m.start_at || m.created || "unknown"}\n` +
      `Source: ${suffix ? "notes" : "transcript"}\n` +
      `${"-".repeat(60)}\n\n`;
    await uploadText(drive, subId, name, header + content);
    uploaded++;
    if (uploaded % 10 === 0) console.log(`[avoma-drive] uploaded ${uploaded}...`);
  }

  console.log(`[avoma-drive] done. uploaded=${uploaded} skipped(existing)=${skipped} no-transcript=${noContent}`);
}

main().catch((e) => { console.error("[avoma-drive] FAILED:", e); process.exit(1); });
