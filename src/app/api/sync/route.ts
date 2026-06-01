import { NextResponse } from "next/server";
import { getProgress, runSync } from "@/lib/sync-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/sync — trigger a sync cycle (runs in the background; poll /api/progress).
export async function POST() {
  const current = getProgress();
  if (current.running) {
    return NextResponse.json({ started: false, ...current });
  }
  // Fire and forget — progress is tracked in module state.
  void runSync();
  return NextResponse.json({ started: true, ...getProgress() });
}

// GET /api/sync — sync status.
export function GET() {
  return NextResponse.json(getProgress());
}
