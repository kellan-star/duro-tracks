"use client";

import { useSalesReps } from "@/hooks/useSalesReps";
import { CoveragePill } from "@/components/shared/CoveragePill";
import { RepAvatar } from "@/components/shared/RepAvatar";

export function SalesRepsTab() {
  const { data, isLoading } = useSalesReps();

  if (isLoading || !data) {
    return <div style={{ color: "var(--text-3)", fontSize: 13 }}>Loading sales reps...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.015em" }}>Sales Reps</div>
          <div style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 2 }}>
            Activity, Value Mapping and Qualification coverage by sales rep
          </div>
        </div>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <colgroup>
            <col style={{ width: "auto" }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 130 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Rep</th>
              <th style={{ textAlign: "right" }}>Transcripts</th>
              <th>Last meeting</th>
              <th style={{ textAlign: "right" }}>Accounts</th>
              <th>Acct discovery</th>
              <th>Value map</th>
              <th>MEDDPICC</th>
            </tr>
          </thead>
          <tbody>
            {data.reps.map((rep) => (
              <tr key={rep.email}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <RepAvatar name={rep.name} />
                    <span style={{ fontWeight: 500 }}>{rep.name}</span>
                    {rep.callCount === 0 && (
                      <span className="pill pill-bad" style={{ marginLeft: 4, height: 18, fontSize: 10.5, padding: "0 6px", minWidth: "auto" }}>
                        Inactive
                      </span>
                    )}
                  </div>
                </td>
                <td className="num" style={{ textAlign: "right", color: "var(--text-2)" }}>{rep.callCount}</td>
                <td className="num" style={{ color: "var(--text-3)" }}>
                  {rep.lastCallDate ? new Date(rep.lastCallDate).toLocaleDateString() : "—"}
                </td>
                <td className="num" style={{ textAlign: "right", color: "var(--text-2)" }}>{rep.accountCount}</td>
                <td><CoveragePill value={rep.accountDiscoveryScore} /></td>
                <td><CoveragePill value={rep.valueMapScore} /></td>
                <td><CoveragePill value={rep.meddpiccScore} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
