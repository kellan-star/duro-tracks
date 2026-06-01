"use client";

import { useReps } from "@/hooks/use-data";
import { Avatar } from "@/components/shared/Avatar";
import { CoveragePill } from "@/components/shared/CoveragePill";
import { RegionTag } from "@/components/shared/RegionTag";

function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function RepsTab() {
  const { data, isLoading } = useReps();
  const reps = data?.reps ?? [];

  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Rep</th>
            <th>Region</th>
            <th className="!text-right">Calls</th>
            <th>Last call</th>
            <th className="!text-right">Accounts</th>
            <th className="!text-right">Account Discovery</th>
            <th className="!text-right">Value Map</th>
            <th className="!text-right">MEDDPICC</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr><td colSpan={8} className="text-center text-[var(--text-muted)]">Loading…</td></tr>
          )}
          {reps.map((r) => (
            <tr key={r.name}>
              <td>
                <span className="flex items-center gap-2">
                  <Avatar name={r.name} />
                  <span className="font-medium">{r.name}</span>
                  {!r.active && (
                    <span className="tag" style={{ color: "var(--text-subtle)" }}>Inactive</span>
                  )}
                </span>
              </td>
              <td><RegionTag region={r.region} /></td>
              <td className="text-right tabular-nums">{r.callCount}</td>
              <td className="text-[var(--text-muted)]">{fmtDate(r.lastCall)}</td>
              <td className="text-right tabular-nums">{r.accountCount}</td>
              <td className="text-right"><CoveragePill score={r.scores.discovery} /></td>
              <td className="text-right"><CoveragePill score={r.scores.valueMap} /></td>
              <td className="text-right"><CoveragePill score={r.scores.meddpicc} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
