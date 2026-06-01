"use client";

import { useKpis } from "@/hooks/use-data";

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-2.5">
      <span className="text-[18px] font-semibold leading-none tabular-nums">{value}</span>
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
    </div>
  );
}

export function KpiStrip() {
  const { data } = useKpis();
  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-[1180px] divide-x divide-[var(--border)]">
        <Kpi label="Accounts tracked" value={data ? String(data.accountsTracked) : "—"} />
        <Kpi label="Call transcripts" value={data ? String(data.callTranscripts) : "—"} />
        <Kpi label="Avg coverage" value={data ? `${data.avgCoverage}%` : "—"} />
        <Kpi
          label="Active reps"
          value={data ? `${data.activeReps}/${data.totalReps}` : "—"}
        />
      </div>
    </div>
  );
}
