import { NextResponse } from "next/server";
import { getAllAccountRows } from "@/lib/db";
import { TRACKED_REPS, EMPTY_DEAL, type DealClassification } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: string): string {
  const s = v ?? "";
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/export — CSV of deal status per account, keyed by domain, for pasting
// into the accounts spreadsheet (columns Status / Closed Lost Category /
// Closed Lost Details). Accounts with no transcripts are marked "No-show".
export function GET() {
  const rows = getAllAccountRows();
  const header = ["Domain", "Company", "Lead Rep", "Status", "Closed Lost Category", "Closed Lost Details"];
  const lines = [header.map(csvCell).join(",")];

  for (const r of rows) {
    const leadRep = TRACKED_REPS.find((t) => t.email === r.lead_rep_email)?.name || r.lead_rep_email || "";

    let deal: DealClassification = { ...EMPTY_DEAL };
    if (r.deal_status_json) {
      try {
        deal = JSON.parse(r.deal_status_json) as DealClassification;
      } catch {
        /* keep default */
      }
    }

    // No transcripts → never really engaged → No-show.
    const status = r.transcript_count === 0 ? "No-show" : deal.status || "Open";
    const category = status === "Closed Lost" ? deal.closedLostCategory || "" : "";
    const details = status === "Closed Lost" ? deal.closedLostDetails || "" : "";

    lines.push(
      [r.domain, r.company_name, leadRep, status, category, details].map(csvCell).join(",")
    );
  }

  // Leading BOM so Excel/Sheets read UTF-8 correctly.
  const csv = "﻿" + lines.join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="duro-deal-status.csv"',
    },
  });
}
