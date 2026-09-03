import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { queryAccountsTab } from "@/lib/tab-queries";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
const MODEL = process.env.AGGREGATE_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

function extractJson(text: string): Record<string, unknown> {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return {};
  try {
    return JSON.parse(m[0]);
  } catch {
    return {};
  }
}

// POST { domains: string[] }  or  GET ?domains=a.com,b.com
// Synthesizes the main reasons a set of (won) accounts bought Duro, from the
// facts already extracted from their calls. Add &dryRun=1 to just see which
// accounts matched + their digests (no AI call).
async function handle(domains: string[], dryRun: boolean) {
  const wanted = new Set(domains.map((d) => d.trim().toLowerCase()).filter(Boolean));
  if (wanted.size === 0) {
    return NextResponse.json({ error: "Provide domains (?domains=a.com,b.com or POST {domains:[]})" }, { status: 400 });
  }

  const all = queryAccountsTab().accounts;
  const matched = all.filter((a) => wanted.has(a.domain.toLowerCase()));
  const foundDomains = new Set(matched.map((a) => a.domain.toLowerCase()));
  const notFound = [...wanted].filter((d) => !foundDomains.has(d));

  const digests = matched.map((a) => ({
    account: a.companyName,
    domain: a.domain,
    companyPriorities: a.accountDiscovery.companyPriorities,
    urgency: a.accountDiscovery.urgency,
    decisionCriteria: a.meddpicc.decisionCriteria,
    identifiedPain: a.meddpicc.identifyPain,
    valueUnlocked: a.valueMap.plm.valueUnlocked,
    competitors: a.meddpicc.competitors,
  }));

  if (dryRun) {
    return NextResponse.json({ matched: matched.length, notFound, digests });
  }
  if (digests.length === 0) {
    return NextResponse.json({ error: "None of the given domains matched analyzed accounts", notFound }, { status: 404 });
  }

  const prompt = readFileSync(join(process.cwd(), "src", "prompts", "win-reasons.md"), "utf-8");
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      { role: "user", content: `${prompt}\n\n## Accounts (${digests.length})\n\n${JSON.stringify(digests, null, 2)}` },
    ],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = extractJson(text) as { themes?: Array<{ reason?: string; count?: number; accounts?: string[] }>; narrative?: string };

  const total = digests.length;
  const themes = (Array.isArray(parsed.themes) ? parsed.themes : [])
    .map((t) => ({
      reason: String(t.reason || ""),
      count: Number(t.count) || 0,
      pct: total ? Math.round(((Number(t.count) || 0) / total) * 100) : 0,
      accounts: Array.isArray(t.accounts) ? t.accounts : [],
    }))
    .filter((t) => t.reason)
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    accountsAnalyzed: total,
    notFound,
    narrative: typeof parsed.narrative === "string" ? parsed.narrative : "",
    themes,
  });
}

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const domains = (url.searchParams.get("domains") || "").split(/[,\n]/);
  return handle(domains, url.searchParams.get("dryRun") === "1");
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

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
