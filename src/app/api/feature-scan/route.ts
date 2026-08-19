import { NextResponse } from "next/server";
import { startFeatureScan, getFeatureScan, isScanning } from "@/lib/feature-scan-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// GET  -> poll status/results. &details=1 includes per-account evidence.
// POST -> start a scan over ALL accounts with transcripts (or POST {domains:[]}
//         to restrict). Fire-and-forget; returns 202. Poll GET until status=done.
export async function GET(request: Request) {
  const details = new URL(request.url).searchParams.get("details") === "1";
  return NextResponse.json(getFeatureScan(details));
}

export async function POST(request: Request) {
  if (isScanning()) {
    return NextResponse.json({ error: "Scan already in progress", ...getFeatureScan(false) }, { status: 409 });
  }
  let domains: string[] | undefined;
  try {
    const body = await request.json();
    if (Array.isArray(body?.domains)) domains = body.domains;
  } catch {
    /* no body = scan all */
  }
  const { total } = startFeatureScan(domains);
  return NextResponse.json({ started: true, total }, { status: 202 });
}
