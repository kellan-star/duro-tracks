import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync-engine";
import { getLastSyncTimestamp, isSyncing } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  return NextResponse.json({
    lastSyncAt: getLastSyncTimestamp(),
    isSyncing: isSyncing(),
  });
}

export async function POST(request: Request) {
  // ?force=1 re-runs every per-account AI analysis even when transcripts are
  // unchanged, so it can cost real money on a large book — admin token only.
  // A plain incremental POST stays open: it is what the dashboard's "Sync now"
  // button and the browser's daily auto-sync call, and the transcript-hash
  // check means it only pays for accounts that actually changed.
  const force = new URL(request.url).searchParams.get("force") === "1";
  if (force) {
    const denied = requireAdmin(request);
    if (denied) return denied;
  }

  if (isSyncing()) {
    return NextResponse.json(
      { error: "Sync already in progress" },
      { status: 409 }
    );
  }

  // Fire-and-forget: a full sync can run for many minutes (transcripts +
  // per-account + aggregate AI), which would blow past the platform's request
  // timeout and 502. runSync() sets the "syncing" flag synchronously before its
  // first await, so the client can poll GET /api/sync and GET /api/progress.
  void runSync(force).catch((e) => {
    console.error("[duro-tracks] Sync failed:", e);
  });

  return NextResponse.json({ started: true }, { status: 202 });
}
