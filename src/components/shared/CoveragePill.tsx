import { band } from "@/lib/scoring";

export function CoveragePill({ score }: { score: number }) {
  const b = band(score);
  return <span className={`pill pill--${b}`}>{score}%</span>;
}
