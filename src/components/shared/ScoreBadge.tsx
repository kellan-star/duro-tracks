interface ScoreBadgeProps {
  score: number;
  label?: string;
}

export function ScoreBadge({ score, label }: ScoreBadgeProps) {
  const bg =
    score >= 67
      ? "bg-emerald-100 text-emerald-700"
      : score >= 34
        ? "bg-amber-100 text-amber-700"
        : score > 0
          ? "bg-red-100 text-red-700"
          : "bg-slate-100 text-slate-400";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bg}`}>
      {score}%{label ? ` ${label}` : ""}
    </span>
  );
}
