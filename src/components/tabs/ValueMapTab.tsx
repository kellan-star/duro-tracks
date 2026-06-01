"use client";

import { useValueMap } from "@/hooks/useValueMap";
import { ThemeRow } from "@/components/shared/ThemeRow";

function CrossAccountChip({ count }: { count: number }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 10px", background: "var(--surface)",
      border: "1px solid var(--border)", borderRadius: 999,
      fontSize: 11.5, color: "var(--text-2)",
    }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M3 8c.5-1 1.5-1.5 3-1.5S8.5 7 9 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="6" cy="5" r="1.2" fill="currentColor" />
      </svg>
      <span className="num"><strong style={{ color: "var(--text)", fontWeight: 600 }}>{count}</strong> accounts analyzed</span>
    </span>
  );
}

export function ValueMapTab() {
  const { data, isLoading } = useValueMap();

  if (isLoading || !data) {
    return <div style={{ color: "var(--text-3)", fontSize: 13 }}>Loading value map...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div className="h-eyebrow" style={{ marginBottom: 4 }}>Cross-account insights</div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.015em" }}>Value Map</div>
          <div style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 2 }}>
            Personas, jobs to be done and value unlocked per app and portal
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {data.analyzedAt && (
            <span style={{ fontSize: 11.5, color: "var(--text-4)" }}>
              Last analyzed: {new Date(data.analyzedAt).toLocaleString()}
            </span>
          )}
          <CrossAccountChip count={data.totalAccounts} />
        </div>
      </div>

      <div className="vm-table">
        <div className="vm-head-row">
          <div className="vm-head-cell">App / Portal</div>
          <div className="vm-head-cell">Persona</div>
          <div className="vm-head-cell">Jobs to be done</div>
          <div className="vm-head-cell">Value unlocked</div>
        </div>
        {data.rows.map((row) => (
          <div key={row.appKey} className="vm-row-grid">
            <div className="vm-app-cell">
              <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text)" }}>
                {row.appLabel}
              </span>
            </div>
            <VMSubCol themes={row.persona} />
            <VMSubCol themes={row.jobs} />
            <VMSubCol themes={row.value} />
          </div>
        ))}
      </div>
    </div>
  );
}

function VMSubCol({ themes }: { themes: Array<{ label: string; body: string; pct: number }> }) {
  return (
    <div className="vm-sub-col">
      {themes.length === 0 ? (
        <div style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-4)", fontStyle: "italic" }}>
          No data
        </div>
      ) : (
        themes.map((t, i) => <ThemeRow key={i} theme={t} compact />)
      )}
    </div>
  );
}
