import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { anthropicRateLimiter } from "./rate-limiter";
import {
  getAllAccountRows,
  saveAggregateInsight,
} from "./db";
import {
  type AccountDiscovery,
  type ValueMap,
  type Meddpicc,
  ACCOUNT_DISCOVERY_KEYS,
  ACCOUNT_DISCOVERY_LABELS,
  VALUE_MAP_APP_KEYS,
  VALUE_MAP_APP_LABELS,
  VALUE_MAP_COLUMN_KEYS,
  VALUE_MAP_COLUMN_LABELS,
  MEDDPICC_KEYS,
  MEDDPICC_LABELS,
  EMPTY_ACCOUNT_DISCOVERY,
  EMPTY_VALUE_MAP,
  EMPTY_MEDDPICC,
} from "./types";

const promptCache: Record<string, string> = {};

function loadPrompt(filename: string): string {
  if (!promptCache[filename]) {
    const path = join(process.cwd(), "src", "prompts", filename);
    promptCache[filename] = readFileSync(path, "utf-8");
  }
  return promptCache[filename];
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

function extractJson(text: string): Record<string, unknown> {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {};
  }
}

function parseJson<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

async function callClaude(prompt: string, label: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await anthropicRateLimiter.acquire();
      const result = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
      return result.content[0].type === "text" ? result.content[0].text : "";
    } catch (error: unknown) {
      const errStr = String(error);
      if (errStr.includes("429") || errStr.includes("rate_limit")) {
        const waitSec = Math.pow(2, attempt + 1) * 15;
        console.log(`[duro-tracks] Aggregate rate limited (${label}), waiting ${waitSec}s`);
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Max retries exceeded for aggregate ${label}`);
}

function buildDataSection(
  accounts: Array<{ name: string; data: Record<string, string> }>,
  labels: Record<string, string>
): string {
  const lines: string[] = [];
  for (const [key, label] of Object.entries(labels)) {
    lines.push(`### ${label} (key: "${key}")`);
    let hasAny = false;
    for (const acct of accounts) {
      const val = acct.data[key];
      if (val?.trim()) {
        lines.push(`${acct.name}: ${val}`);
        hasAny = true;
      }
    }
    if (!hasAny) lines.push("_No data from any account_");
    lines.push("");
  }
  return lines.join("\n");
}

export async function runAggregateAnalysis(): Promise<void> {
  const rows = getAllAccountRows();
  if (rows.length === 0) return;

  const accountCount = rows.length;

  const accountsAD = rows.map((r) => ({
    name: r.company_name,
    data: parseJson<AccountDiscovery>(r.account_discovery_json, { ...EMPTY_ACCOUNT_DISCOVERY }) as unknown as Record<string, string>,
  }));

  const accountsMP = rows.map((r) => ({
    name: r.company_name,
    data: parseJson<Meddpicc>(r.meddpicc_json, { ...EMPTY_MEDDPICC }) as unknown as Record<string, string>,
  }));

  const accountsVM = rows.map((r) => {
    const vm = parseJson<ValueMap>(r.value_map_json, JSON.parse(JSON.stringify(EMPTY_VALUE_MAP)));
    const flat: Record<string, string> = {};
    for (const appKey of VALUE_MAP_APP_KEYS) {
      for (const colKey of VALUE_MAP_COLUMN_KEYS) {
        flat[`${appKey}.${colKey}`] = vm[appKey]?.[colKey] || "";
      }
    }
    return { name: r.company_name, data: flat };
  });

  // 1. Account Discovery aggregate
  console.log(`[duro-tracks] Running aggregate analysis: Account Discovery (${accountCount} accounts)`);
  try {
    const template = loadPrompt("aggregate-account-discovery.md");
    const adData = buildDataSection(accountsAD, ACCOUNT_DISCOVERY_LABELS as unknown as Record<string, string>);
    const adFormat = JSON.stringify(
      Object.fromEntries(ACCOUNT_DISCOVERY_KEYS.map((k) => [k, ""])),
      null,
      2
    );
    const adPrompt = template
      .replace("{ACCOUNT_COUNT}", String(accountCount))
      .replace("{DATA}", adData)
      .replace("{FORMAT}", adFormat);
    const adResponse = await callClaude(adPrompt, "Account Discovery");
    const adParsed = extractJson(adResponse) as Record<string, string>;
    const adResult: Record<string, string> = {};
    for (const key of ACCOUNT_DISCOVERY_KEYS) {
      adResult[key] = typeof adParsed[key] === "string" ? adParsed[key] : "";
    }
    saveAggregateInsight("accountDiscovery", JSON.stringify(adResult), accountCount);
    console.log(`[duro-tracks] Aggregate Account Discovery complete`);
  } catch (e) {
    console.error(`[duro-tracks] Aggregate Account Discovery failed:`, String(e).slice(0, 200));
  }

  await new Promise((r) => setTimeout(r, 13000));

  // 2. Value Map aggregate
  console.log(`[duro-tracks] Running aggregate analysis: Value Map (${accountCount} accounts)`);
  try {
    const template = loadPrompt("aggregate-value-map.md");
    const vmLabels: Record<string, string> = {};
    for (const appKey of VALUE_MAP_APP_KEYS) {
      for (const colKey of VALUE_MAP_COLUMN_KEYS) {
        vmLabels[`${appKey}.${colKey}`] = `${VALUE_MAP_APP_LABELS[appKey]} — ${VALUE_MAP_COLUMN_LABELS[colKey]}`;
      }
    }
    const vmData = buildDataSection(accountsVM, vmLabels);
    const vmFormat = JSON.stringify(
      Object.fromEntries(
        VALUE_MAP_APP_KEYS.flatMap((app) =>
          VALUE_MAP_COLUMN_KEYS.map((col) => [`${app}.${col}`, ""])
        )
      ),
      null,
      2
    );
    const vmPrompt = template
      .replace("{ACCOUNT_COUNT}", String(accountCount))
      .replace("{DATA}", vmData)
      .replace("{FORMAT}", vmFormat);
    const vmResponse = await callClaude(vmPrompt, "Value Map");
    const vmParsed = extractJson(vmResponse) as Record<string, unknown>;

    // Tolerate both the requested flat keys ("plm.persona") and a nested
    // object ({ plm: { persona: ... } }) that the model may emit instead.
    const vmGet = (appKey: string, colKey: string): string => {
      const flat = vmParsed[`${appKey}.${colKey}`];
      if (typeof flat === "string") return flat;
      const nested = vmParsed[appKey];
      if (nested && typeof nested === "object") {
        const v = (nested as Record<string, unknown>)[colKey];
        if (typeof v === "string") return v;
      }
      return "";
    };

    const vmResult: Record<string, Record<string, string>> = {};
    for (const appKey of VALUE_MAP_APP_KEYS) {
      vmResult[appKey] = {};
      for (const colKey of VALUE_MAP_COLUMN_KEYS) {
        vmResult[appKey][colKey] = vmGet(appKey, colKey);
      }
    }
    saveAggregateInsight("valueMap", JSON.stringify(vmResult), accountCount);
    console.log(`[duro-tracks] Aggregate Value Map complete`);
  } catch (e) {
    console.error(`[duro-tracks] Aggregate Value Map failed:`, String(e).slice(0, 200));
  }

  await new Promise((r) => setTimeout(r, 13000));

  // 3. MEDDPICC aggregate
  console.log(`[duro-tracks] Running aggregate analysis: MEDDPICC (${accountCount} accounts)`);
  try {
    const template = loadPrompt("aggregate-meddpicc.md");
    const mpData = buildDataSection(accountsMP, MEDDPICC_LABELS as unknown as Record<string, string>);
    const mpFormat = JSON.stringify(
      Object.fromEntries(MEDDPICC_KEYS.map((k) => [k, ""])),
      null,
      2
    );
    const mpPrompt = template
      .replace("{ACCOUNT_COUNT}", String(accountCount))
      .replace("{DATA}", mpData)
      .replace("{FORMAT}", mpFormat);
    const mpResponse = await callClaude(mpPrompt, "MEDDPICC");
    const mpParsed = extractJson(mpResponse) as Record<string, string>;
    const mpResult: Record<string, string> = {};
    for (const key of MEDDPICC_KEYS) {
      mpResult[key] = typeof mpParsed[key] === "string" ? mpParsed[key] : "";
    }
    saveAggregateInsight("meddpicc", JSON.stringify(mpResult), accountCount);
    console.log(`[duro-tracks] Aggregate MEDDPICC complete`);
  } catch (e) {
    console.error(`[duro-tracks] Aggregate MEDDPICC failed:`, String(e).slice(0, 200));
  }
}
