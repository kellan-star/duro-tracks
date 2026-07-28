import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import type {
  AnalysisResult,
  AccountDiscovery,
  ValueMap,
  ValueMapEntry,
  Meddpicc,
  DealClassification,
  DealStatus,
} from "./types";
import {
  EMPTY_ACCOUNT_DISCOVERY,
  EMPTY_VALUE_MAP,
  EMPTY_MEDDPICC,
  EMPTY_DEAL,
  DEAL_STATUS_VALUES,
  CLOSED_LOST_CATEGORIES,
  ACCOUNT_DISCOVERY_KEYS,
  VALUE_MAP_APP_KEYS,
  VALUE_MAP_COLUMN_KEYS,
  VALUE_MAP_CELL_COUNT,
  MEDDPICC_KEYS,
} from "./types";
import { anthropicRateLimiter } from "./rate-limiter";

// Per-account extraction is a structured task — default to Haiku (much cheaper).
// Override with ANALYSIS_MODEL, or ANTHROPIC_MODEL to set both tiers at once.
const ANALYSIS_MODEL =
  process.env.ANALYSIS_MODEL || process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

let promptCache: string | null = null;

function loadPrompt(): string {
  if (!promptCache) {
    const path = join(process.cwd(), "src", "prompts", "account-analysis.md");
    promptCache = readFileSync(path, "utf-8");
  }
  return promptCache;
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const EMPTY_RESULT: AnalysisResult = {
  accountDiscovery: { ...EMPTY_ACCOUNT_DISCOVERY },
  valueMap: JSON.parse(JSON.stringify(EMPTY_VALUE_MAP)),
  meddpicc: { ...EMPTY_MEDDPICC },
  deal: { ...EMPTY_DEAL },
};

function extractJson(text: string): Record<string, unknown> {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {};
  }
}

async function callWithRetry(
  companyName: string,
  transcriptText: string,
  maxRetries = 3
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await anthropicRateLimiter.acquire();
      const result = await client.messages.create({
        model: ANALYSIS_MODEL,
        max_tokens: 4096,
        system: systemBlocks(),
        messages: [{ role: "user", content: userContent(companyName, transcriptText) }],
      });
      return result.content[0].type === "text" ? result.content[0].text : "";
    } catch (error: unknown) {
      const errStr = String(error);
      if (errStr.includes("429") || errStr.includes("rate_limit")) {
        const waitSec = Math.pow(2, attempt + 1) * 15;
        console.log(
          `[duro-tracks] Rate limited for "${companyName}", waiting ${waitSec}s (attempt ${attempt + 1}/${maxRetries})`
        );
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Max retries exceeded for "${companyName}"`);
}

function parseAccountDiscovery(raw: Record<string, string>): AccountDiscovery {
  const result = { ...EMPTY_ACCOUNT_DISCOVERY };
  for (const key of ACCOUNT_DISCOVERY_KEYS) {
    if (raw[key] && typeof raw[key] === "string") result[key] = raw[key];
  }
  return result;
}

// Case-insensitive map of an object's keys → values (tolerates "PLM" vs "plm",
// "JobsToBeDone" vs "jobsToBeDone", etc. that models occasionally emit).
function lowerKeyed(raw: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      out[k.toLowerCase()] = v;
    }
  }
  return out;
}

function parseValueMapEntry(raw: unknown): ValueMapEntry {
  const m = lowerKeyed(raw);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    persona: str(m["persona"]),
    jobsToBeDone: str(m["jobstobedone"] ?? m["jobs"]),
    valueUnlocked: str(m["valueunlocked"] ?? m["value"]),
  };
}

function parseValueMap(raw: unknown): ValueMap {
  const result = JSON.parse(JSON.stringify(EMPTY_VALUE_MAP)) as ValueMap;
  const m = lowerKeyed(raw);
  for (const appKey of VALUE_MAP_APP_KEYS) {
    const entry = m[appKey.toLowerCase()];
    if (entry) result[appKey] = parseValueMapEntry(entry);
  }
  return result;
}

function parseMeddpicc(raw: Record<string, string>): Meddpicc {
  const result = { ...EMPTY_MEDDPICC };
  for (const key of MEDDPICC_KEYS) {
    if (raw[key] && typeof raw[key] === "string") result[key] = raw[key];
  }
  return result;
}

export function computeTranscriptHash(texts: string[]): string {
  const hash = createHash("sha256");
  for (const t of texts) hash.update(t);
  return hash.digest("hex");
}

const MAX_TRANSCRIPT_CHARS = 100000;

function truncateTranscripts(transcriptTexts: string[]): string {
  const combined = transcriptTexts.join("\n\n---\n\n");
  return combined.length > MAX_TRANSCRIPT_CHARS
    ? combined.slice(0, MAX_TRANSCRIPT_CHARS) + "\n\n[Transcripts truncated]"
    : combined;
}

function userContent(companyName: string, transcriptText: string): string {
  return `## Call Transcripts for "${companyName}"\n\n${transcriptText}`;
}

// System block is identical across accounts → cached for ~90% cheaper input.
function systemBlocks() {
  return [
    { type: "text" as const, text: loadPrompt(), cache_control: { type: "ephemeral" as const } },
  ];
}

// Validate the model's deal classification against the allowed values.
// (No-show is applied by rule for accounts with no transcripts, not here.)
function parseDeal(raw: unknown): DealClassification {
  const m = lowerKeyed(raw);
  const rawStatus = typeof m["status"] === "string" ? (m["status"] as string).trim() : "";
  const status: DealStatus =
    (DEAL_STATUS_VALUES as readonly string[]).includes(rawStatus) && rawStatus !== "No-show"
      ? (rawStatus as DealStatus)
      : "Open";
  if (status !== "Closed Lost") {
    return { status, closedLostCategory: "", closedLostDetails: "" };
  }
  const rawCat = typeof m["closedlostcategory"] === "string" ? (m["closedlostcategory"] as string).trim() : "";
  const category = (CLOSED_LOST_CATEGORIES as readonly string[]).includes(rawCat) ? rawCat : "Other";
  const details = typeof m["closedlostdetails"] === "string" ? (m["closedlostdetails"] as string).trim() : "";
  return { status, closedLostCategory: category, closedLostDetails: details };
}

// Parse a model response into a full AnalysisResult (never throws).
function parseResult(responseText: string, companyName: string): AnalysisResult {
  const parsed = extractJson(responseText);
  const result: AnalysisResult = {
    accountDiscovery: parseAccountDiscovery((parsed.accountDiscovery || {}) as Record<string, string>),
    valueMap: parseValueMap(parsed.valueMap),
    meddpicc: parseMeddpicc((parsed.meddpicc || {}) as Record<string, string>),
    deal: parseDeal(parsed.dealStatus),
  };
  const adCount = ACCOUNT_DISCOVERY_KEYS.filter((k) => result.accountDiscovery[k]).length;
  const vmCount = VALUE_MAP_APP_KEYS.reduce(
    (sum, app) => sum + VALUE_MAP_COLUMN_KEYS.filter((col) => result.valueMap[app][col]).length,
    0
  );
  const mpCount = MEDDPICC_KEYS.filter((k) => result.meddpicc[k]).length;
  console.log(
    `[duro-tracks] AI: "${companyName}" → ${adCount}/7 AD, ${vmCount}/${VALUE_MAP_CELL_COUNT} VM, ${mpCount}/8 MP`
  );
  return result;
}

export async function analyzeAccount(
  companyName: string,
  transcriptTexts: string[]
): Promise<AnalysisResult> {
  const truncated = truncateTranscripts(transcriptTexts);
  if (!truncated.trim()) return { ...EMPTY_RESULT };

  try {
    const responseText = await callWithRetry(companyName, truncated);
    return parseResult(responseText, companyName);
  } catch (error) {
    console.error(`[duro-tracks] AI failed for "${companyName}":`, String(error).slice(0, 200));
    return { ...EMPTY_RESULT };
  }
}

export interface BatchAccountInput {
  domain: string;
  companyName: string;
  transcripts: string[];
}

// Analyze many accounts via the Message Batches API (~50% cheaper, no per-call
// rate-limit pacing). Returns a map domain → AnalysisResult with an entry for
// every input (empty result for any that error/expire).
export async function analyzeAccountsBatch(
  inputs: BatchAccountInput[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, AnalysisResult>> {
  const out = new Map<string, AnalysisResult>();
  for (const inp of inputs) out.set(inp.domain, { ...EMPTY_RESULT });
  if (inputs.length === 0) return out;

  const requests = inputs.map((inp, i) => ({
    custom_id: `acct-${i}`,
    params: {
      model: ANALYSIS_MODEL,
      max_tokens: 4096,
      system: systemBlocks(),
      messages: [
        {
          role: "user" as const,
          content: userContent(inp.companyName, truncateTranscripts(inp.transcripts)),
        },
      ],
    },
  }));

  const batch = await client.messages.batches.create({ requests });
  console.log(`[duro-tracks] Batch ${batch.id} submitted: ${requests.length} accounts`);

  const startedAt = Date.now();
  const MAX_WAIT_MS = 60 * 60 * 1000; // give up after 1h
  let status = batch;
  while (status.processing_status !== "ended") {
    if (Date.now() - startedAt > MAX_WAIT_MS) {
      console.error(`[duro-tracks] Batch ${batch.id} not finished after 1h — returning partial`);
      return out;
    }
    await new Promise((r) => setTimeout(r, 5000));
    status = await client.messages.batches.retrieve(batch.id);
    const c = status.request_counts;
    onProgress?.(c.succeeded + c.errored + c.canceled + c.expired, requests.length);
  }

  const results = await client.messages.batches.results(batch.id);
  for await (const entry of results) {
    const idx = Number(entry.custom_id.replace("acct-", ""));
    const inp = inputs[idx];
    if (!inp) continue;
    if (entry.result.type === "succeeded") {
      const text = entry.result.message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      out.set(inp.domain, parseResult(text, inp.companyName));
    } else {
      console.error(`[duro-tracks] Batch entry for ${inp.domain}: ${entry.result.type}`);
    }
  }
  return out;
}
