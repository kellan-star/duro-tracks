function bandFor(v: number | null | undefined): string {
  if (v == null || v === 0) return "null";
  if (v >= 75) return "ok";
  if (v >= 26) return "warn";
  return "bad";
}

export function CoveragePill({ value }: { value: number | null | undefined }) {
  const band = bandFor(value);
  return <span className={`pill pill-${band}`}>{value ?? 0}%</span>;
}
