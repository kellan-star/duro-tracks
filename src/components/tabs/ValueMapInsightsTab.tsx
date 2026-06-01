"use client";

import { useValueMapInsights } from "@/hooks/use-data";
import { ThemeList } from "@/components/shared/ThemeList";
import { VALUE_MAP_APPS, VALUE_MAP_DIMENSIONS } from "@/lib/types";

export function ValueMapInsightsTab() {
  const { data, isLoading } = useValueMapInsights();
  const insights = data?.insights;

  return (
    <div>
      <p className="mb-3 text-[12px] text-[var(--text-muted)]">
        Aggregate Value Map themes grounded in customer commentary. Filtered to 30%+ of accounts.
      </p>
      <div className="card overflow-hidden">
        {/* Header row: App/Portal + 3 dimensions */}
        <div className="grid grid-cols-[120px_repeat(3,1fr)] border-b border-[var(--border)] bg-[var(--bg)]">
          <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            App / Portal
          </div>
          {VALUE_MAP_DIMENSIONS.map((d) => (
            <div
              key={d.key}
              className="border-l border-[var(--border)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]"
            >
              {d.label}
            </div>
          ))}
        </div>

        {VALUE_MAP_APPS.map((app) => (
          <div key={app} className="grid grid-cols-[120px_repeat(3,1fr)]">
            <div className="px-4 py-4 text-[13px] font-semibold">{app}</div>
            {VALUE_MAP_DIMENSIONS.map((d) => (
              <div key={d.key} className="border-l border-[var(--border)] px-4 py-4">
                {isLoading ? (
                  <p className="text-[12px] text-[var(--text-subtle)]">Loading…</p>
                ) : (
                  <ThemeList themes={insights?.[app]?.[d.key] ?? []} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
