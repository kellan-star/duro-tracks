import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getAllTranscripts } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// GET /api/transcripts/export — admin-token only (bulk raw call content).
// Streams a .zip containing every stored transcript, grouped by account, plus a
// manifest.csv index. Send the DURO_ADMIN_TOKEN via the x-duro-token header.
export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const rows = getAllTranscripts();
  if (rows.length === 0) {
    return NextResponse.json({ error: "No transcripts stored yet" }, { status: 404 });
  }

  const zip = new JSZip();

  // Keep filenames safe and unique. A meeting may have both a transcript and a
  // notes row (same uuid, different source), so include the source in the name.
  const safe = (s: string | null | undefined, fallback: string) =>
    (s || fallback).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || fallback;

  const manifest: string[] = ["domain,company,meeting_uuid,source,start_at,subject,chars"];

  for (const r of rows) {
    const domainDir = safe(r.account_domain, "unknown-account");
    const suffix = r.source && r.source !== "transcript" ? `.${r.source}` : "";
    const path = `${domainDir}/${safe(r.meeting_uuid, "meeting")}${suffix}.txt`;

    const header =
      `Account: ${r.company_name || r.account_domain || "unknown"}\n` +
      `Domain: ${r.account_domain || "unknown"}\n` +
      `Meeting: ${r.subject || "(no subject)"}\n` +
      `Meeting UUID: ${r.meeting_uuid}\n` +
      `Date: ${r.start_at || "unknown"}\n` +
      `Source: ${r.source}\n` +
      `${"-".repeat(60)}\n\n`;
    zip.file(path, header + r.content);

    const csvField = (v: string | null | undefined) => `"${(v || "").replace(/"/g, '""')}"`;
    manifest.push(
      [
        csvField(r.account_domain),
        csvField(r.company_name),
        csvField(r.meeting_uuid),
        csvField(r.source),
        csvField(r.start_at),
        csvField(r.subject),
        String((r.content || "").length),
      ].join(",")
    );
  }

  zip.file("manifest.csv", "﻿" + manifest.join("\r\n"));

  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="duro-tracks-transcripts-${stamp}.zip"`,
      "Content-Length": String(buf.length),
    },
  });
}
