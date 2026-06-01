import {
  DISCOVERY_QUESTIONS,
  MEDDPICC_CATEGORIES,
  VALUE_MAP_APPS,
  VALUE_MAP_DIMENSIONS,
  type AccountAnalysis,
  type CoverageScores,
} from "./types";

function isFilled(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function pct(filled: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((filled / total) * 100);
}

/** Coverage = percent of non-empty fields in each framework. */
export function scoreAnalysis(a: AccountAnalysis): CoverageScores {
  const discoveryFilled = DISCOVERY_QUESTIONS.filter((q) => isFilled(a.discovery?.[q.key])).length;

  let vmFilled = 0;
  let vmTotal = 0;
  for (const app of VALUE_MAP_APPS) {
    for (const dim of VALUE_MAP_DIMENSIONS) {
      vmTotal += 1;
      if (isFilled(a.valueMap?.[app]?.[dim.key])) vmFilled += 1;
    }
  }

  const meddpiccFilled = MEDDPICC_CATEGORIES.filter((c) => isFilled(a.meddpicc?.[c.key])).length;

  return {
    discovery: pct(discoveryFilled, DISCOVERY_QUESTIONS.length),
    valueMap: pct(vmFilled, vmTotal),
    meddpicc: pct(meddpiccFilled, MEDDPICC_CATEGORIES.length),
  };
}

/** Color band for a coverage percentage. */
export type Band = "green" | "amber" | "red" | "gray";
export function band(score: number): Band {
  if (score >= 75) return "green";
  if (score >= 26) return "amber";
  if (score >= 1) return "red";
  return "gray";
}
