"use client";

import { useAccountDiscovery } from "@/hooks/useAccountDiscovery";
import { ThemeRow } from "@/components/shared/ThemeRow";

function DiscoveryIcon({ title }: { title: string }) {
  const lower = title.toLowerCase();
  let bg = "var(--accent-soft)", fg = "var(--accent)";
  let path: React.ReactNode;
  if (lower.includes("priorit")) {
    path = <path d="M7 2v10M3 6l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />;
  } else if (lower.includes("competit")) {
    bg = "#FFFBEB"; fg = "var(--tiger-deep)";
    path = <><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" /><circle cx="7" cy="7" r="1.5" fill="currentColor" /></>;
  } else if (lower.includes("urgenc")) {
    bg = "var(--bad-bg)"; fg = "var(--bad-fg)";
    path = <><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" /><path d="M7 4v3.5L9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></>;
  } else {
    bg = "#F0FDF4"; fg = "var(--ok-fg)";
    path = <><rect x="2.5" y="2.5" width="3.5" height="3.5" rx="0.8" stroke="currentColor" strokeWidth="1.3" /><rect x="8" y="2.5" width="3.5" height="3.5" rx="0.8" stroke="currentColor" strokeWidth="1.3" /><rect x="2.5" y="8" width="3.5" height="3.5" rx="0.8" stroke="currentColor" strokeWidth="1.3" /><rect x="8" y="8" width="3.5" height="3.5" rx="0.8" stroke="currentColor" strokeWidth="1.3" /></>;
  }
  return (
    <span style={{ width: 22, height: 22, background: bg, color: fg, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">{path}</svg>
    </span>
  );
}

export function AccountDiscoveryTab() {
  const { data, isLoading } = useAccountDiscovery();

  if (isLoading || !data) {
    return <div style={{ color: "var(--text-3)", fontSize: 13 }}>Loading account discovery...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div className="h-eyebrow" style={{ marginBottom: 4 }}>Cross-account insights</div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.015em" }}>Account Discovery</div>
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

      {data.sections.every((s) => s.themes.length === 0) ? (
        <div className="insight-card" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ color: "var(--text-3)" }}>No aggregate insights yet. Run a sync to generate cross-account analysis.</p>
        </div>
      ) : (
        <div className="insight-grid">
          {data.sections.map((section) => (
            <div key={section.key} className="insight-card">
              <div className="insight-head">
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>
                  <DiscoveryIcon title={section.label} />
                  <span>{section.label}</span>
                </div>
                <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                  {section.themes.length} {section.themes.length === 1 ? "theme" : "themes"}
                </span>
              </div>
              <div style={{ padding: 0 }}>
                {section.themes.length === 0 ? (
                  <div style={{ padding: "12px 18px", fontSize: 12.5, color: "var(--text-4)", fontStyle: "italic" }}>
                    No themes above threshold
                  </div>
                ) : (
                  section.themes.map((theme, i) => (
                    <ThemeRow key={i} theme={theme} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
