"use client";

import Link from "next/link";
import { useAccounts } from "@/hooks/useAccounts";
import { CoveragePill } from "@/components/shared/CoveragePill";
import { CompanyAvatar } from "@/components/shared/CompanyAvatar";
import { accountDiscoveryScore, valueMapScore, meddpiccScore } from "@/lib/types";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    "Closed Won": { background: "var(--ok-bg)", color: "var(--ok-fg)", borderColor: "var(--ok-border)" },
    "Closed Lost": { background: "var(--bad-bg)", color: "var(--bad-fg)", borderColor: "var(--bad-border)" },
    "Open": { background: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent-ring)" },
    "No-show": { background: "var(--null-bg)", color: "var(--null-fg)", borderColor: "var(--null-border)" },
  };
  const s = styles[status] || styles["Open"];
  return (
    <span className="pill" style={{ minWidth: "auto", padding: "0 8px", ...s }}>
      {status || "—"}
    </span>
  );
}

export function AccountsTab() {
  const { data, isLoading } = useAccounts();

  if (isLoading || !data) {
    return <div style={{ color: "var(--text-3)", fontSize: 13 }}>Loading accounts...</div>;
  }

  const { accounts } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.015em" }}>Accounts</div>
          <div style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 2 }}>
            Coverage of Account Discovery, Value Map and MEDDPICC across the book
          </div>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="tbl-wrap" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ color: "var(--text-3)" }}>No accounts yet. Run a sync to fetch data from Avoma.</p>
        </div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <colgroup>
              <col style={{ width: "auto" }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 95 }} />
              <col style={{ width: 125 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 85 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 95 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>Company</th>
                <th style={{ whiteSpace: "nowrap" }}>Domain</th>
                <th style={{ whiteSpace: "nowrap" }}>Lead Rep</th>
                <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Transcripts</th>
                <th style={{ whiteSpace: "nowrap" }}>Last meeting</th>
                <th style={{ whiteSpace: "nowrap" }}>Account Discovery</th>
                <th style={{ whiteSpace: "nowrap" }}>Value Map</th>
                <th style={{ whiteSpace: "nowrap" }}>MEDDPICC</th>
                <th style={{ whiteSpace: "nowrap" }}>Status</th>
                <th style={{ whiteSpace: "nowrap" }}>Closed Lost Category</th>
                <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Acct Summary</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acct) => (
                <tr key={acct.domain}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <CompanyAvatar name={acct.companyName} />
                      <span style={{ fontWeight: 500 }}>{acct.companyName}</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-3)" }}>{acct.domain}</td>
                  <td style={{ color: "var(--text-2)" }}>{acct.leadRepName}</td>
                  <td className="num" style={{ textAlign: "right", color: "var(--text-2)" }}>{acct.transcriptCount}</td>
                  <td className="num" style={{ color: "var(--text-3)" }}>
                    {new Date(acct.lastCallDate).toLocaleDateString()}
                  </td>
                  <td><CoveragePill value={accountDiscoveryScore(acct.accountDiscovery)} /></td>
                  <td><CoveragePill value={valueMapScore(acct.valueMap)} /></td>
                  <td><CoveragePill value={meddpiccScore(acct.meddpicc)} /></td>
                  <td><StatusBadge status={acct.deal.status} /></td>
                  <td style={{ color: "var(--text-2)" }}>
                    {acct.deal.status === "Closed Lost" ? acct.deal.closedLostCategory || "—" : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/accounts/${encodeURIComponent(acct.domain)}`}
                      style={{ color: "var(--accent)", fontWeight: 500, fontSize: 12.5, whiteSpace: "nowrap" }}
                    >
                      View&nbsp;→
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
