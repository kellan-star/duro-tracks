import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { queryAccountsTab } from "@/lib/tab-queries";
import { getTranscriptsForAccount } from "@/lib/db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
const MODEL = process.env.ANALYSIS_MODEL || process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

const MAX_CHARS = 80000;
const CONCURRENCY = 6;

export type Signal = { value: boolean; evidence: string };
export type Detail = { account: string; domain: string; ai: Signal; api: Signal; buildOwn: Signal };

type JobStatus = "idle" | "running" | "done" | "error";
interface JobState {
  status: JobStatus;
  total: number;
  processed: number;
  startedAt: number;
  finishedAt: number;
  error: string;
  details: Detail[];
}

// Survive Next.js HMR / route module reloads.
const g = globalThis as unknown as { __duroFeatureScan?: JobState };
function job(): JobState {
  if (!g.__duroFeatureScan) {
    g.__duroFeatureScan = { status: "idle", total: 0, processed: 0, startedAt: 0, finishedAt: 0, error: "", details: [] };
  }
  return g.__duroFeatureScan;
}

function truncate(texts: string[]): string {
  const combined = texts.join("\n\n---\n\n");
  return combined.length > MAX_CHARS ? combined.slice(0, MAX_CHARS) + "\n\n[Transcripts truncated]" : combined;
}

function extractJson(text: string): Record<string, unknown> {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return {};
  try {
    return JSON.parse(m[0]);
  } catch {
    return {};
  }
}

const norm = (s?: Partial<Signal>): Signal => ({
  value: Boolean(s?.value),
  evidence: typeof s?.evidence === "string" ? s.evidence : "",
});

async function classify(prompt: string, companyName: string, domain: string): Promise<Detail> {
  const empty: Signal = { value: false, evidence: "" };
  const texts = getTranscriptsForAccount(domain);
  if (texts.length === 0) return { account: companyName, domain, ai: { ...empty }, api: { ...empty }, buildOwn: { ...empty } };

  // retry a couple times on rate-limit / overloaded
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 500,
        messages: [
          { role: "user", content: `${prompt}\n\n## Account: ${companyName} (${domain})\n\n## Transcripts\n\n${truncate(texts)}` },
        ],
      });
      const text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      const parsed = extractJson(text) as { ai?: Partial<Signal>; api?: Partial<Signal>; buildOwn?: Partial<Signal> };
      return { account: companyName, domain, ai: norm(parsed.ai), api: norm(parsed.api), buildOwn: norm(parsed.buildOwn) };
    } catch (e) {
      lastErr = e;
      const status = (e as { status?: number })?.status;
      if (status === 429 || status === 529 || status === 503) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      break;
    }
  }
  console.error(`[feature-scan] classify failed for ${domain}:`, lastErr);
  return { account: companyName, domain, ai: { ...empty }, api: { ...empty }, buildOwn: { ...empty } };
}

async function pool<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export function isScanning(): boolean {
  return job().status === "running";
}

// { domains?: string[] } — restrict to these; otherwise scan ALL accounts that have transcripts.
export function startFeatureScan(domains?: string[]): { total: number } {
  const j = job();
  const all = queryAccountsTab().accounts;
  let targets = all.filter((a) => a.transcriptCount > 0);
  if (domains && domains.length) {
    const wanted = new Set(domains.map((d) => d.trim().toLowerCase()).filter(Boolean));
    targets = targets.filter((a) => wanted.has(a.domain.toLowerCase()));
  }

  j.status = "running";
  j.total = targets.length;
  j.processed = 0;
  j.startedAt = Date.now();
  j.finishedAt = 0;
  j.error = "";
  j.details = [];

  const prompt = readFileSync(join(process.cwd(), "src", "prompts", "feature-scan.md"), "utf-8");

  // fire-and-forget
  void (async () => {
    try {
      await pool(targets, CONCURRENCY, async (a) => {
        const d = await classify(prompt, a.companyName, a.domain);
        j.details.push(d);
        j.processed++;
      });
      j.status = "done";
      j.finishedAt = Date.now();
    } catch (e) {
      j.status = "error";
      j.error = e instanceof Error ? e.message : String(e);
      j.finishedAt = Date.now();
    }
  })();

  return { total: targets.length };
}

export function getFeatureScan(includeDetails: boolean) {
  const j = job();
  const elapsedSeconds = j.startedAt ? Math.round(((j.finishedAt || Date.now()) - j.startedAt) / 1000) : 0;
  const base = { status: j.status, processed: j.processed, total: j.total, elapsedSeconds };
  if (j.status === "error") return { ...base, error: j.error };
  if (j.status !== "done") return base;

  const scanned = j.details.length;
  const pct = (n: number) => (scanned ? Math.round((n / scanned) * 100) : 0);
  const pick = (key: "ai" | "api" | "buildOwn") => {
    const hits = j.details.filter((d) => d[key].value);
    return { count: hits.length, pct: pct(hits.length), accounts: hits.map((d) => d.account) };
  };

  const summary = {
    ...base,
    accountsScanned: scanned,
    aiFeatures: pick("ai"),
    apiSupport: pick("api"),
    buildOwnPlm: pick("buildOwn"),
  };
  if (!includeDetails) return summary;
  return { ...summary, details: j.details };
}
