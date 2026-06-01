import { completeJson } from "./anthropic";
import { loadPrompt } from "./prompts";
import {
  DISCOVERY_QUESTIONS,
  MEDDPICC_CATEGORIES,
  VALUE_MAP_APPS,
  VALUE_MAP_DIMENSIONS,
  type AccountAnalysis,
} from "./types";

// Cap the transcript text sent per account to stay within token limits.
const MAX_TRANSCRIPT_CHARS = 120_000;

/** Builds an empty analysis (used when there is no content / on parse failure). */
export function emptyAnalysis(): AccountAnalysis {
  const discovery = Object.fromEntries(DISCOVERY_QUESTIONS.map((q) => [q.key, ""]));
  const meddpicc = Object.fromEntries(MEDDPICC_CATEGORIES.map((c) => [c.key, ""]));
  const valueMap = Object.fromEntries(
    VALUE_MAP_APPS.map((app) => [
      app,
      Object.fromEntries(VALUE_MAP_DIMENSIONS.map((d) => [d.key, ""])),
    ]),
  );
  return { discovery, valueMap, meddpicc } as unknown as AccountAnalysis;
}

/** Normalizes a possibly-partial model result into a complete AccountAnalysis. */
function normalize(raw: Partial<AccountAnalysis> | null): AccountAnalysis {
  const base = emptyAnalysis();
  if (!raw) return base;

  for (const q of DISCOVERY_QUESTIONS) {
    const v = raw.discovery?.[q.key];
    if (typeof v === "string") base.discovery[q.key] = v.trim();
  }
  for (const c of MEDDPICC_CATEGORIES) {
    const v = raw.meddpicc?.[c.key];
    if (typeof v === "string") base.meddpicc[c.key] = v.trim();
  }
  for (const app of VALUE_MAP_APPS) {
    for (const d of VALUE_MAP_DIMENSIONS) {
      const v = raw.valueMap?.[app]?.[d.key];
      if (typeof v === "string") base.valueMap[app][d.key] = v.trim();
    }
  }
  return base;
}

/**
 * Runs the single per-account analysis prompt against the concatenated
 * transcript text and returns a structured AccountAnalysis.
 */
export async function analyzeAccount(
  company: string,
  domain: string,
  transcripts: string[],
): Promise<AccountAnalysis> {
  const joined = transcripts.join("\n\n----- NEXT CALL -----\n\n").slice(0, MAX_TRANSCRIPT_CHARS);
  if (!joined.trim()) return emptyAnalysis();

  const system = loadPrompt("account-analysis.md");
  const user = `Account: ${company} (${domain})\n\nCALL TRANSCRIPTS:\n\n${joined}`;

  try {
    const raw = await completeJson<Partial<AccountAnalysis>>(system, user, 4096);
    return normalize(raw);
  } catch (err) {
    console.error(`[analyzer] analysis failed for ${domain}:`, err);
    return emptyAnalysis();
  }
}
