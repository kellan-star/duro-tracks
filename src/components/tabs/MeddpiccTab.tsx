"use client";

import { useMeddpicc } from "@/hooks/useMeddpicc";
import { ThemeRow } from "@/components/shared/ThemeRow";

const MEDDPICC_LETTERS: Record<string, string> = {
  metrics: "M",
  economicBuyer: "E",
  decisionCriteria: "D",
  decisionProcess: "D",
  paperProcess: "P",
  identifyPain: "I",
  champion: "C",
  competitors: "C",
};

function MeddpChip({ letter }: { letter: string }) {
  return (
    <span className="meddp-chip">{letter}</span>
  );
}

function MeddpLegend() {
  const letters = "MEDDPICC".split("");
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center", padding: "5px 10px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 999 }}>
      <span style={{ fontSize: 11, color: "var(--text-3)", marginRight: 4 }}>Framework</span>
      {letters.map((l, i) => (
        <span key={i} style={{
          width: 16, height: 16, borderRadius: 4,
          background: "var(--surface-2)", color: "var(--text-3)",
          fontSize: 9.5, fontWeight: 700,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>{l}</span>
      ))}
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

export function MeddpiccTab() {
  const { data, isLoading } = useMeddpicc();

  if (isLoading || !data) {
    return <div style={{ color: "var(--text-3)", fontSize: 13 }}>Loading MEDDPICC...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div className="h-eyebrow" style={{ marginBottom: 4 }}>Cross-account insights</div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.015em" }}>MEDDPICC</div>
          <div style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 2 }}>
            Deal-qualification signals aggregated across the analyzed book
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {data.analyzedAt && (
            <span style={{ fontSize: 11.5, color: "var(--text-4)" }}>
              Last analyzed: {new Date(data.analyzedAt).toLocaleString()}
            </span>
          )}
          <CrossAccountChip count={data.totalAccounts} />
          <MeddpLegend />
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
                  <MeddpChip letter={MEDDPICC_LETTERS[section.key] || "?"} />
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
