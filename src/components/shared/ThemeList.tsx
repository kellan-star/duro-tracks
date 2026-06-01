import type { AggregateTheme } from "@/lib/types";
import { band } from "@/lib/scoring";

export function ThemeList({ themes }: { themes: AggregateTheme[] }) {
  if (!themes || themes.length === 0) {
    return <p className="text-[12px] text-[var(--text-subtle)]">No themes above threshold.</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {themes.map((t, i) => (
        <li key={i} className="flex items-center gap-2">
          <span className={`pill pill--${band(t.percentage)}`}>{t.percentage}%</span>
          <span className="text-[13px] leading-snug">{t.theme}</span>
        </li>
      ))}
    </ul>
  );
}
