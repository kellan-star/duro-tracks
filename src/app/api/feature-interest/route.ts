import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { queryAccountsTab } from "@/lib/tab-queries";
import { getTranscriptsForAccount } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
// Cheap tier — this is a per-account yes/no classification.
const MODEL = process.env.ANALYSIS_MODEL || process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

const MAX_CHARS = 80000; // per account, keeps each call fast enough to avoid gateway timeouts
const CONCURRENCY = 6;

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

type Signal = { value: boolean; evidence: string };
type Detail = { account: string; domain: string; ai: Signal; api: Signal };

async function classifyAccount(prompt: string, companyName: string, domain: string): Promise<Detail> {
  const texts = getTranscriptsForAccount(domain);
  const empty: Signal = { value: false, evidence: "" };
  if (texts.length === 0) return { account: companyName, domain, ai: empty, api: { ...empty } };

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [
      { role: "user", content: `${prompt}\n\n## Account: ${companyName} (${domain})\n\n## Transcripts\n\n${truncate(texts)}` },
    ],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = extractJson(text) as { ai?: Partial<Signal>; api?: Partial<Signal> };
  const norm = (s?: Partial<Signal>): Signal => ({
    value: Boolean(s?.value),
    evidence: typeof s?.evidence === "string" ? s.evidence : "",
  });
  return { account: companyName, domain, ai: norm(parsed.ai), api: norm(parsed.api) };
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// POST { domains: string[] }  or  GET ?domains=a.com,b.com
// For each account, classifies whether the customer indicated that AI features
// and/or API support in their PLM stack would be of value. Add &dryRun=1 to see
// which accounts matched + their transcript counts (no AI call).
async function handle(domains: string[], dryRun: boolean) {
  const wanted = new Set(domains.map((d) => d.trim().toLowerCase()).filter(Boolean));
  if (wanted.size === 0) {
    return NextResponse.json({ error: "Provide domains (?domains=a.com,b.com or POST {domains:[]})" }, { status: 400 });
  }

  const all = queryAccountsTab().accounts;
  const matched = all.filter((a) => wanted.has(a.domain.toLowerCase()));
  const foundDomains = new Set(matched.map((a) => a.domain.toLowerCase()));
  const notFound = [...wanted].filter((d) => !foundDomains.has(d));

  if (dryRun) {
    return NextResponse.json({
      matched: matched.length,
      notFound,
      accounts: matched.map((a) => ({ account: a.companyName, domain: a.domain, transcriptCount: getTranscriptsForAccount(a.domain).length })),
    });
  }
  if (matched.length === 0) {
    return NextResponse.json({ error: "None of the given domains matched analyzed accounts", notFound }, { status: 404 });
  }

  const prompt = readFileSync(join(process.cwd(), "src", "prompts", "feature-interest.md"), "utf-8");
  const details = await pool(matched, CONCURRENCY, (a) => classifyAccount(prompt, a.companyName, a.domain));

  const total = details.length;
  const aiAccounts = details.filter((d) => d.ai.value);
  const apiAccounts = details.filter((d) => d.api.value);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return NextResponse.json({
    accountsAnalyzed: total,
    notFound,
    aiFeatures: {
      count: aiAccounts.length,
      pct: pct(aiAccounts.length),
      accounts: aiAccounts.map((d) => d.account),
    },
    apiSupport: {
      count: apiAccounts.length,
      pct: pct(apiAccounts.length),
      accounts: apiAccounts.map((d) => d.account),
    },
    details,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const domains = (url.searchParams.get("domains") || "").split(/[,\n]/);
  return handle(domains, url.searchParams.get("dryRun") === "1");
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let domains: string[] = [];
  try {
    const body = await request.json();
    if (Array.isArray(body?.domains)) domains = body.domains;
  } catch {
    /* ignore */
  }
  return handle(domains, url.searchParams.get("dryRun") === "1");
}
