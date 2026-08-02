import { NextResponse } from "next/server";
import { getAccountsMentioning } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mentions?q=PDM
// Counts UNIQUE accounts whose transcripts mention the term (case-insensitive
// substring), plus the per-account transcript hit counts. Exact text search —
// no AI/tokens. Add &format=csv for a CSV download.
export function GET(request: Request) {
  const url = new URL(request.url);
  const term = (url.searchParams.get("q") || "").trim();
  if (!term) {
    return NextResponse.json({ error: "Provide a search term, e.g. ?q=PDM" }, { status: 400 });
  }

  const accounts = getAccountsMentioning(term);
  const accountCount = accounts.length;
  const transcriptCount = accounts.reduce((s, a) => s + a.hits, 0);

  if (url.searchParams.get("format") === "csv") {
    const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = ["Domain,Company,Transcripts mentioning"];
    for (const a of accounts) {
      lines.push([a.domain, a.company_name || "", String(a.hits)].map(cell).join(","));
    }
    return new NextResponse("﻿" + lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="mentions-${term.replace(/[^a-z0-9]+/gi, "_")}.csv"`,
      },
    });
  }

  return NextResponse.json({ term, accountCount, transcriptCount, accounts });
}
