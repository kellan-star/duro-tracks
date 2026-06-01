import crypto from "node:crypto";
import { getDb, getMeta, setMeta } from "./db";
import {
  INTERNAL_DOMAINS,
  MAX_DEALS,
  PERSONAL_EMAIL_DOMAINS,
  SYNC_WINDOW_DAYS,
  TRACKED_REPS,
} from "./config";
import {
  getNotes,
  getTranscription,
  hasAvomaKey,
  listMeetings,
  type AvomaAttendee,
  type AvomaMeeting,
} from "./avoma-client";
import { analyzeAccount } from "./account-analyzer";
import {
  aggregateDiscovery,
  aggregateMeddpicc,
  aggregateValueMap,
} from "./aggregate-analyzer";
import { hasAnthropicKey } from "./anthropic";
import { scoreAnalysis } from "./scoring";
import type { AccountAnalysis, Region } from "./types";

// ---------------------------------------------------------------------------
// Progress state (polled by GET /api/progress)
// ---------------------------------------------------------------------------

export interface SyncProgress {
  running: boolean;
  phase: string;
  current: number;
  total: number;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  lastSync: string | null;
}

let progress: SyncProgress = {
  running: false,
  phase: "idle",
  current: 0,
  total: 0,
  startedAt: null,
  finishedAt: null,
  error: null,
  lastSync: null,
};

export function getProgress(): SyncProgress {
  return { ...progress, lastSync: getMeta("last_sync") };
}

function setPhase(phase: string, current = 0, total = 0) {
  progress = { ...progress, phase, current, total };
}

// ---------------------------------------------------------------------------
// Attendee / domain helpers
// ---------------------------------------------------------------------------

function domainOf(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

function isInternalDomain(d: string): boolean {
  return INTERNAL_DOMAINS.some((id) => d === id || d.endsWith(`.${id}`));
}

function trackedRepsOnCall(attendees: AvomaAttendee[]): string[] {
  const emails = new Set(attendees.map((a) => a.email.toLowerCase()));
  return TRACKED_REPS.filter((rep) => rep.emails.some((e) => emails.has(e.toLowerCase()))).map(
    (r) => r.name,
  );
}

function duroSideCount(attendees: AvomaAttendee[]): number {
  return attendees.filter((a) => domainOf(a.email) === "durolabs.co").length;
}

function externalAttendees(attendees: AvomaAttendee[]): AvomaAttendee[] {
  return attendees.filter((a) => {
    const d = domainOf(a.email);
    return d && !isInternalDomain(d);
  });
}

/** Resolves the prospect domain: most common corporate (non-personal) domain. */
function resolveDomain(attendees: AvomaAttendee[]): string | null {
  const counts = new Map<string, number>();
  for (const a of externalAttendees(attendees)) {
    const d = domainOf(a.email);
    if (!d || PERSONAL_EMAIL_DOMAINS.has(d)) continue;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [d, c] of counts) {
    if (c > bestCount) {
      best = d;
      bestCount = c;
    }
  }
  return best;
}

/** A call qualifies for inclusion per the PRD filtering rules. */
function callQualifies(attendees: AvomaAttendee[]): boolean {
  const hasTrackedRep = trackedRepsOnCall(attendees).length >= 1;
  const hasExternal = externalAttendees(attendees).length >= 1;
  const notTraining = duroSideCount(attendees) <= 1;
  return hasTrackedRep && hasExternal && notTraining;
}

function companyFromDomain(domain: string): string {
  const base = domain.split(".")[0] ?? domain;
  return base
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function regionForRep(name: string): Region | null {
  return TRACKED_REPS.find((r) => r.name === name)?.region ?? null;
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

export async function runSync(): Promise<SyncProgress> {
  if (progress.running) return getProgress();

  const db = getDb();
  progress = {
    running: true,
    phase: "starting",
    current: 0,
    total: 0,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
    lastSync: getMeta("last_sync"),
  };

  try {
    if (!hasAvomaKey()) {
      throw new Error("AVOMA_API_KEY is not set — cannot fetch meetings.");
    }

    // 1. Determine sync window (full on first sync, incremental after).
    const lastSync = getMeta("last_sync");
    const now = new Date();
    const fromDate = lastSync
      ? lastSync.slice(0, 10)
      : new Date(now.getTime() - SYNC_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
    const toDate = now.toISOString().slice(0, 10);

    // 2. Fetch + filter meetings.
    setPhase("fetching meetings");
    const meetings = await listMeetings(fromDate, toDate);
    const qualifying = meetings.filter((m) => callQualifies(m.attendees));

    // 3. Store new calls + fetch transcripts for ones we don't have yet.
    const existing = new Set(
      (db.prepare("SELECT id FROM calls").all() as { id: string }[]).map((r) => r.id),
    );
    const newMeetings = qualifying.filter((m) => !existing.has(m.id));

    const insertCall = db.prepare(
      `INSERT OR REPLACE INTO calls (id, subject, start_time, attendees, tracked_reps, domain)
       VALUES (@id, @subject, @startTime, @attendees, @trackedReps, @domain)`,
    );
    const insertTranscript = db.prepare(
      `INSERT OR REPLACE INTO transcripts (meeting_id, text, source) VALUES (?, ?, ?)`,
    );

    const touchedDomains = new Set<string>();

    setPhase("fetching transcripts", 0, newMeetings.length);
    for (let i = 0; i < newMeetings.length; i++) {
      const m = newMeetings[i];
      const domain = resolveDomain(m.attendees);
      insertCall.run({
        id: m.id,
        subject: m.subject,
        startTime: m.startTime,
        attendees: JSON.stringify(m.attendees),
        trackedReps: JSON.stringify(trackedRepsOnCall(m.attendees)),
        domain,
      });

      // transcript (primary) → notes (fallback)
      let text = await getTranscription(m.id);
      let source = "transcript";
      if (!text) {
        text = await getNotes(m.id);
        source = "notes";
      }
      if (text) {
        insertTranscript.run(m.id, text, source);
        if (domain) touchedDomains.add(domain);
      }
      setPhase("fetching transcripts", i + 1, newMeetings.length);
    }

    // 4. Recompute account aggregates from stored calls/transcripts.
    setPhase("resolving accounts");
    rebuildAccounts(db);

    // 5. Per-account AI analysis for changed accounts.
    if (hasAnthropicKey()) {
      const dirty = db
        .prepare("SELECT domain, company FROM accounts WHERE analysis_dirty = 1 ORDER BY call_count DESC")
        .all() as { domain: string; company: string }[];
      const limited = MAX_DEALS > 0 ? dirty.slice(0, MAX_DEALS) : dirty;

      setPhase("analyzing accounts", 0, limited.length);
      let analysisChanged = false;
      for (let i = 0; i < limited.length; i++) {
        const { domain, company } = limited[i];
        const transcripts = (
          db
            .prepare(
              `SELECT t.text FROM transcripts t
               JOIN calls c ON c.id = t.meeting_id
               WHERE c.domain = ? ORDER BY c.start_time`,
            )
            .all(domain) as { text: string }[]
        ).map((r) => r.text);

        const analysis = await analyzeAccount(company, domain, transcripts);
        storeAnalysis(db, domain, analysis);
        analysisChanged = true;
        setPhase("analyzing accounts", i + 1, limited.length);
      }

      // 6. Aggregate insights — only re-run when individual analyses changed.
      if (analysisChanged) {
        setPhase("aggregating insights");
        await runAggregates(db);
      }
    } else {
      progress = { ...progress, error: "ANTHROPIC_API_KEY not set — skipped AI analysis." };
    }

    // 7. Update sync timestamp.
    setMeta("last_sync", new Date().toISOString());
    setPhase("done");
    progress = { ...progress, running: false, finishedAt: new Date().toISOString() };
  } catch (err) {
    console.error("[sync] failed:", err);
    progress = {
      ...progress,
      running: false,
      phase: "error",
      error: err instanceof Error ? err.message : String(err),
      finishedAt: new Date().toISOString(),
    };
  }

  return getProgress();
}

// ---------------------------------------------------------------------------
// Account rebuild + analysis persistence
// ---------------------------------------------------------------------------

function rebuildAccounts(db: ReturnType<typeof getDb>) {
  const calls = db
    .prepare("SELECT id, start_time, tracked_reps, domain FROM calls WHERE domain IS NOT NULL")
    .all() as { id: string; start_time: string | null; tracked_reps: string; domain: string }[];

  const byDomain = new Map<
    string,
    { calls: number; lastCall: string | null; repCounts: Map<string, number>; meetingIds: string[] }
  >();

  for (const c of calls) {
    const entry =
      byDomain.get(c.domain) ??
      { calls: 0, lastCall: null, repCounts: new Map<string, number>(), meetingIds: [] };
    entry.calls += 1;
    entry.meetingIds.push(c.id);
    if (c.start_time && (!entry.lastCall || c.start_time > entry.lastCall)) {
      entry.lastCall = c.start_time;
    }
    for (const rep of JSON.parse(c.tracked_reps) as string[]) {
      entry.repCounts.set(rep, (entry.repCounts.get(rep) ?? 0) + 1);
    }
    byDomain.set(c.domain, entry);
  }

  const transcriptCounts = new Map<string, number>();
  for (const row of db
    .prepare(
      `SELECT c.domain AS domain, COUNT(*) AS n FROM transcripts t
       JOIN calls c ON c.id = t.meeting_id WHERE c.domain IS NOT NULL GROUP BY c.domain`,
    )
    .all() as { domain: string; n: number }[]) {
    transcriptCounts.set(row.domain, row.n);
  }

  const upsert = db.prepare(
    `INSERT INTO accounts (domain, company, lead_rep, region, call_count, transcript_count, last_call, analysis_dirty, updated_at)
     VALUES (@domain, @company, @leadRep, @region, @callCount, @transcriptCount, @lastCall, @dirty, datetime('now'))
     ON CONFLICT(domain) DO UPDATE SET
       company = excluded.company,
       lead_rep = excluded.lead_rep,
       region = excluded.region,
       call_count = excluded.call_count,
       transcript_count = excluded.transcript_count,
       last_call = excluded.last_call,
       analysis_dirty = CASE WHEN accounts.transcript_count != excluded.transcript_count THEN 1 ELSE accounts.analysis_dirty END,
       updated_at = datetime('now')`,
  );

  for (const [domain, e] of byDomain) {
    let leadRep: string | null = null;
    let leadCount = 0;
    for (const [rep, n] of e.repCounts) {
      if (n > leadCount) {
        leadRep = rep;
        leadCount = n;
      }
    }
    upsert.run({
      domain,
      company: companyFromDomain(domain),
      leadRep,
      region: leadRep ? regionForRep(leadRep) : null,
      callCount: e.calls,
      transcriptCount: transcriptCounts.get(domain) ?? 0,
      lastCall: e.lastCall,
      dirty: 1, // freshly (re)built; cleared after analysis stores
    });
  }
}

function sourceHash(db: ReturnType<typeof getDb>, domain: string): string {
  const ids = (
    db
      .prepare(
        `SELECT t.meeting_id AS id FROM transcripts t
         JOIN calls c ON c.id = t.meeting_id WHERE c.domain = ? ORDER BY t.meeting_id`,
      )
      .all(domain) as { id: string }[]
  ).map((r) => r.id);
  return crypto.createHash("sha1").update(ids.join(",")).digest("hex");
}

function storeAnalysis(db: ReturnType<typeof getDb>, domain: string, analysis: AccountAnalysis) {
  const scores = scoreAnalysis(analysis);
  db.prepare(
    `INSERT INTO analysis_results
       (domain, discovery, value_map, meddpicc, discovery_score, value_map_score, meddpicc_score, source_hash, updated_at)
     VALUES (@domain, @discovery, @valueMap, @meddpicc, @ds, @vs, @ms, @hash, datetime('now'))
     ON CONFLICT(domain) DO UPDATE SET
       discovery = excluded.discovery,
       value_map = excluded.value_map,
       meddpicc = excluded.meddpicc,
       discovery_score = excluded.discovery_score,
       value_map_score = excluded.value_map_score,
       meddpicc_score = excluded.meddpicc_score,
       source_hash = excluded.source_hash,
       updated_at = datetime('now')`,
  ).run({
    domain,
    discovery: JSON.stringify(analysis.discovery),
    valueMap: JSON.stringify(analysis.valueMap),
    meddpicc: JSON.stringify(analysis.meddpicc),
    ds: scores.discovery,
    vs: scores.valueMap,
    ms: scores.meddpicc,
    hash: sourceHash(db, domain),
  });
  db.prepare("UPDATE accounts SET analysis_dirty = 0 WHERE domain = ?").run(domain);
}

async function runAggregates(db: ReturnType<typeof getDb>) {
  const rows = db
    .prepare("SELECT discovery, value_map, meddpicc FROM analysis_results")
    .all() as { discovery: string; value_map: string; meddpicc: string }[];

  const analyses: AccountAnalysis[] = rows.map((r) => ({
    discovery: JSON.parse(r.discovery),
    valueMap: JSON.parse(r.value_map),
    meddpicc: JSON.parse(r.meddpicc),
  }));

  const [discovery, valuemap, meddpicc] = await Promise.all([
    aggregateDiscovery(analyses),
    aggregateValueMap(analyses),
    aggregateMeddpicc(analyses),
  ]);

  const upsert = db.prepare(
    `INSERT INTO aggregate_insights (framework, data, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(framework) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`,
  );
  upsert.run("discovery", JSON.stringify(discovery));
  upsert.run("valuemap", JSON.stringify(valuemap));
  upsert.run("meddpicc", JSON.stringify(meddpicc));
}
