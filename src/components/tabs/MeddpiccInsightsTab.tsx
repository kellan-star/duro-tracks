"use client";

import { useMeddpiccInsights } from "@/hooks/use-data";
import { ThemeList } from "@/components/shared/ThemeList";
import { MEDDPICC_CATEGORIES } from "@/lib/types";

export function MeddpiccInsightsTab() {
  const { data, isLoading } = useMeddpiccInsights();
  const insights = data?.insights;

  return (
    <div>
      <p className="mb-3 text-[12px] text-[var(--text-muted)]">
        Cross-account themes per MEDDPICC category. Only themes appearing in 30%+ of accounts are
        shown.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {MEDDPICC_CATEGORIES.map((c) => (
          <div key={c.key} className="card p-4">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--brand-soft)] text-[11px] font-bold text-[var(--brand-ink)]">
                {c.letter}
              </span>
              <h3 className="text-[13px] font-semibold">{c.label}</h3>
            </div>
            <p className="mb-3 text-[11px] text-[var(--text-muted)]">{c.description}</p>
            {isLoading ? (
              <p className="text-[12px] text-[var(--text-subtle)]">Loading…</p>
            ) : (
              <ThemeList themes={insights?.[c.key] ?? []} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
