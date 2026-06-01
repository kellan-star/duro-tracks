"use client";

import { useAccounts } from "@/hooks/useAccounts";
import { useSalesReps } from "@/hooks/useSalesReps";
import { accountDiscoveryScore, valueMapScore, meddpiccScore } from "@/lib/types";

export function KpiStrip() {
  const { data: accountData } = useAccounts();
  const { data: repData } = useSalesReps();

  const accounts = accountData?.accounts || [];
  const totalAccounts = accountData?.metadata.totalAccounts ?? 0;
  const totalTranscripts = accountData?.metadata.totalTranscripts ?? 0;

  // Avg coverage = mean of (AD + VM + MP) / 3 across all accounts.
  const avgCoverage =
    accounts.length === 0
      ? 0
      : Math.round(
          accounts.reduce(
            (sum, a) =>
              sum +
              (accountDiscoveryScore(a.accountDiscovery) +
                valueMapScore(a.valueMap) +
                meddpiccScore(a.meddpicc)) /
                3,
            0
          ) / accounts.length
        );

  const reps = repData?.reps || [];
  const activeReps = reps.filter((r) => r.callCount > 0).length;
  const totalReps = reps.length;
  const inactiveRep = reps.find((r) => r.callCount === 0);

  const cellStyle = { flex: 1, minWidth: 0 } as const;
  const labelStyle = { fontSize: 11.5, color: "var(--text-3)", fontWeight: 500, whiteSpace: "nowrap" } as const;
  const valueStyle = { fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" } as const;
  const subStyle = { fontSize: 11.5, color: "var(--text-4)", whiteSpace: "nowrap" } as const;

  return (
    <div className="kpi-strip">
      <div className="kpi-cell" style={cellStyle}>
        <span style={labelStyle}>Accounts tracked</span>
        <span className="num" style={valueStyle}>{totalAccounts}</span>
        <span style={subStyle}>prospect domains</span>
      </div>
      <div className="kpi-cell" style={cellStyle}>
        <span style={labelStyle}>Call transcripts</span>
        <span className="num" style={valueStyle}>{totalTranscripts}</span>
        <span style={subStyle}>stored in database</span>
      </div>
      <div className="kpi-cell" style={cellStyle}>
        <span style={labelStyle}>Avg coverage</span>
        <span className="num" style={valueStyle}>
          {avgCoverage}<span style={{ fontSize: 14, color: "var(--text-3)", fontWeight: 500 }}>%</span>
        </span>
        <span style={subStyle}>AD% · VM% · MP% across accounts</span>
      </div>
      <div className="kpi-cell" style={cellStyle}>
        <span style={labelStyle}>Active reps</span>
        <span className="num" style={valueStyle}>
          {activeReps}<span style={{ fontSize: 14, color: "var(--text-3)", fontWeight: 500 }}>/{totalReps}</span>
        </span>
        <span style={subStyle}>
          {inactiveRep ? `${inactiveRep.name.split(" ")[0]} has 0 calls` : "all active"}
        </span>
      </div>
    </div>
  );
}
