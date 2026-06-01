import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import type { AnalysisResult, AccountDiscovery, ValueMap, ValueMapEntry, Meddpicc } from "./types";
import {
  EMPTY_ACCOUNT_DISCOVERY,
  EMPTY_VALUE_MAP,
  EMPTY_MEDDPICC,
  ACCOUNT_DISCOVERY_KEYS,
  VALUE_MAP_APP_KEYS,
  VALUE_MAP_COLUMN_KEYS,
  VALUE_MAP_CELL_COUNT,
  MEDDPICC_KEYS,
} from "./types";
import { anthropicRateLimiter } from "./rate-limiter";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

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
        model: MODEL,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `${loadPrompt()}\n\n---\n\n## Call Transcripts for "${companyName}"\n\n${transcriptText}`,
          },
        ],
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

function parseValueMapEntry(raw: Record<string, string> | undefined): ValueMapEntry {
  if (!raw) return { persona: "", jobsToBeDone: "", valueUnlocked: "" };
  return {
    persona: typeof raw.persona === "string" ? raw.persona : "",
    jobsToBeDone: typeof raw.jobsToBeDone === "string" ? raw.jobsToBeDone : "",
    valueUnlocked: typeof raw.valueUnlocked === "string" ? raw.valueUnlocked : "",
  };
}

function parseValueMap(raw: Record<string, Record<string, string>> | undefined): ValueMap {
  if (!raw) return JSON.parse(JSON.stringify(EMPTY_VALUE_MAP));
  const result = JSON.parse(JSON.stringify(EMPTY_VALUE_MAP)) as ValueMap;
  for (const appKey of VALUE_MAP_APP_KEYS) {
    if (raw[appKey]) {
      result[appKey] = parseValueMapEntry(raw[appKey]);
    }
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

export async function analyzeAccount(
  companyName: string,
  transcriptTexts: string[]
): Promise<AnalysisResult> {
  const combined = transcriptTexts.join("\n\n---\n\n");
  if (!combined.trim()) return { ...EMPTY_RESULT };

  const maxChars = 100000;
  const truncated =
    combined.length > maxChars
      ? combined.slice(0, maxChars) + "\n\n[Transcripts truncated]"
      : combined;

  try {
    const responseText = await callWithRetry(companyName, truncated);
    const parsed = extractJson(responseText);

    const ad = (parsed.accountDiscovery || {}) as Record<string, string>;
    const vm = (parsed.valueMap || {}) as Record<string, Record<string, string>>;
    const mp = (parsed.meddpicc || {}) as Record<string, string>;

    const result: AnalysisResult = {
      accountDiscovery: parseAccountDiscovery(ad),
      valueMap: parseValueMap(vm),
      meddpicc: parseMeddpicc(mp),
    };

    const adCount = ACCOUNT_DISCOVERY_KEYS.filter((k) => result.accountDiscovery[k]).length;
    const vmCount = VALUE_MAP_APP_KEYS.reduce(
      (sum, app) =>
        sum + VALUE_MAP_COLUMN_KEYS.filter((col) => result.valueMap[app][col]).length,
      0
    );
    const mpCount = MEDDPICC_KEYS.filter((k) => result.meddpicc[k]).length;
    console.log(
      `[duro-tracks] AI: "${companyName}" → ${adCount}/7 AD, ${vmCount}/${VALUE_MAP_CELL_COUNT} VM, ${mpCount}/8 MP`
    );

    return result;
  } catch (error) {
    console.error(
      `[duro-tracks] AI failed for "${companyName}":`,
      String(error).slice(0, 200)
    );
    return { ...EMPTY_RESULT };
  }
}
