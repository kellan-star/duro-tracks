import { completeJson } from "./anthropic";
import { AGGREGATE_THRESHOLD } from "./config";
import { loadPrompt } from "./prompts";
import {
  DISCOVERY_QUESTIONS,
  MEDDPICC_CATEGORIES,
  VALUE_MAP_APPS,
  VALUE_MAP_DIMENSIONS,
  type AccountAnalysis,
  type AggregateTheme,
  type DiscoveryInsights,
  type MeddpiccInsights,
  type ValueMapInsights,
} from "./types";

function sortAndFilter(themes: AggregateTheme[] | undefined): AggregateTheme[] {
  if (!Array.isArray(themes)) return [];
  return themes
    .filter((t) => t && typeof t.theme === "string" && t.theme.trim().length > 0)
    .map((t) => ({ theme: t.theme.trim(), percentage: Math.round(Number(t.percentage) || 0) }))
    .filter((t) => t.percentage >= AGGREGATE_THRESHOLD)
    .sort((a, b) => b.percentage - a.percentage);
}

export async function aggregateDiscovery(analyses: AccountAnalysis[]): Promise<DiscoveryInsights> {
  const empty = Object.fromEntries(
    DISCOVERY_QUESTIONS.map((q) => [q.key, []]),
  ) as unknown as DiscoveryInsights;
  if (analyses.length === 0) return empty;

  const payload = analyses.map((a) => a.discovery);
  const system = loadPrompt("aggregate-discovery.md");
  const raw = await completeJson<DiscoveryInsights>(system, JSON.stringify(payload));

  for (const q of DISCOVERY_QUESTIONS) empty[q.key] = sortAndFilter(raw?.[q.key]);
  return empty;
}

export async function aggregateValueMap(analyses: AccountAnalysis[]): Promise<ValueMapInsights> {
  const empty = Object.fromEntries(
    VALUE_MAP_APPS.map((app) => [
      app,
      Object.fromEntries(VALUE_MAP_DIMENSIONS.map((d) => [d.key, []])),
    ]),
  ) as unknown as ValueMapInsights;
  if (analyses.length === 0) return empty;

  const payload = analyses.map((a) => a.valueMap);
  const system = loadPrompt("aggregate-valuemap.md");
  const raw = await completeJson<ValueMapInsights>(system, JSON.stringify(payload));

  for (const app of VALUE_MAP_APPS) {
    for (const d of VALUE_MAP_DIMENSIONS) {
      empty[app][d.key] = sortAndFilter(raw?.[app]?.[d.key]);
    }
  }
  return empty;
}

export async function aggregateMeddpicc(analyses: AccountAnalysis[]): Promise<MeddpiccInsights> {
  const empty = Object.fromEntries(
    MEDDPICC_CATEGORIES.map((c) => [c.key, []]),
  ) as unknown as MeddpiccInsights;
  if (analyses.length === 0) return empty;

  const payload = analyses.map((a) => a.meddpicc);
  const system = loadPrompt("aggregate-meddpicc.md");
  const raw = await completeJson<MeddpiccInsights>(system, JSON.stringify(payload));

  for (const c of MEDDPICC_CATEGORIES) empty[c.key] = sortAndFilter(raw?.[c.key]);
  return empty;
}
