"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAccounts } from "@/hooks/use-data";
import { Avatar } from "@/components/shared/Avatar";
import { CoveragePill } from "@/components/shared/CoveragePill";
import type { AccountRow } from "@/lib/types";

type SortKey =
  | "company"
  | "leadRep"
  | "callCount"
  | "lastCall"
  | "discovery"
  | "valueMap"
  | "meddpicc";

function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function valueFor(a: AccountRow, key: SortKey): string | number {
  switch (key) {
    case "company": return a.company.toLowerCase();
    case "leadRep": return (a.leadRep ?? "").toLowerCase();
    case "callCount": return a.callCount;
    case "lastCall": return a.lastCall ?? "";
    case "discovery": return a.scores.discovery;
    case "valueMap": return a.scores.valueMap;
    case "meddpicc": return a.scores.meddpicc;
  }
}

export function AccountsTab() {
  const { data, isLoading } = useAccounts();
  const [sort, setSort] = useState<SortKey>("callCount");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => {
    const list = [...(data?.accounts ?? [])];
    list.sort((a, b) => {
      const va = valueFor(a, sort);
      const vb = valueFor(b, sort);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return dir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [data, sort, dir]);

  const onSort = (key: SortKey) => {
    if (key === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir(key === "company" || key === "leadRep" ? "asc" : "desc");
    }
  };

  const Th = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th
      onClick={() => onSort(k)}
      className="cursor-pointer select-none"
      style={{ textAlign: right ? "right" : "left" }}
    >
      {children}
      {sort === k ? (dir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <Th k="company">Company</Th>
            <th>Domain</th>
            <Th k="leadRep">Lead Rep</Th>
            <Th k="callCount" right>Calls</Th>
            <Th k="lastCall">Last call</Th>
            <Th k="discovery" right>Account Discovery</Th>
            <Th k="valueMap" right>Value Map</Th>
            <Th k="meddpicc" right>MEDDPICC</Th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr><td colSpan={9} className="text-center text-[var(--text-muted)]">Loading…</td></tr>
          )}
          {!isLoading && rows.length === 0 && (
            <tr><td colSpan={9} className="text-center text-[var(--text-muted)]">No accounts yet — run a sync.</td></tr>
          )}
          {rows.map((a) => (
            <tr key={a.domain}>
              <td>
                <span className="flex items-center gap-2">
                  <Avatar name={a.company} />
                  <span className="font-medium">{a.company}</span>
                </span>
              </td>
              <td className="text-[var(--text-muted)]">{a.domain}</td>
              <td>{a.leadRep ?? "—"}</td>
              <td className="text-right tabular-nums">{a.callCount}</td>
              <td className="text-[var(--text-muted)]">{fmtDate(a.lastCall)}</td>
              <td className="text-right"><CoveragePill score={a.scores.discovery} /></td>
              <td className="text-right"><CoveragePill score={a.scores.valueMap} /></td>
              <td className="text-right"><CoveragePill score={a.scores.meddpicc} /></td>
              <td className="text-right">
                <Link href={`/accounts/${encodeURIComponent(a.domain)}`} className="font-medium text-[var(--brand)]">
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
