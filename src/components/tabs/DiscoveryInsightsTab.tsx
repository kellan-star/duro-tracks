"use client";

import { useDiscoveryInsights } from "@/hooks/use-data";
import { ThemeList } from "@/components/shared/ThemeList";
import { DISCOVERY_QUESTIONS } from "@/lib/types";

export function DiscoveryInsightsTab() {
  const { data, isLoading } = useDiscoveryInsights();
  const insights = data?.insights;

  return (
    <div>
      <p className="mb-3 text-[12px] text-[var(--text-muted)]">
        Cross-account themes per Account Discovery question. Only themes appearing in 30%+ of
        accounts are shown.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {DISCOVERY_QUESTIONS.map((q) => (
          <div key={q.key} className="card p-4">
            <h3 className="text-[13px] font-semibold">{q.label}</h3>
            <p className="mb-3 text-[11px] text-[var(--text-muted)]">{q.description}</p>
            {isLoading ? (
              <p className="text-[12px] text-[var(--text-subtle)]">Loading…</p>
            ) : (
              <ThemeList themes={insights?.[q.key] ?? []} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
