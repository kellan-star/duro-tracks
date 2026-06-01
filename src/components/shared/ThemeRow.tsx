import { CoveragePill } from "./CoveragePill";

interface Theme {
  label: string;
  body: string;
  pct: number;
}

export function ThemeRow({ theme, compact }: { theme: Theme; compact?: boolean }) {
  return (
    <div className={`theme-row ${compact ? "theme-row-compact" : ""}`}>
      <div style={{ fontSize: compact ? 12.5 : 13, color: "var(--text-2)", lineHeight: 1.5, letterSpacing: "-0.005em" }}>
        {theme.label && (
          <span style={{ color: "var(--text)", fontWeight: 600 }}>{theme.label}</span>
        )}
        {theme.label && theme.body && (
          <span style={{ color: "var(--text-4)", margin: "0 2px" }}>: </span>
        )}
        {theme.body}
      </div>
      <div style={{ flexShrink: 0 }}>
        <CoveragePill value={theme.pct} />
      </div>
    </div>
  );
}
