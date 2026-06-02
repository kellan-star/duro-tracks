import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync-engine";
import { getLastSyncTimestamp, isSyncing } from "@/lib/db";

export async function GET() {
  return NextResponse.json({
    lastSyncAt: getLastSyncTimestamp(),
    isSyncing: isSyncing(),
  });
}

export async function POST(request: Request) {
  if (isSyncing()) {
    return NextResponse.json(
      { error: "Sync already in progress" },
      { status: 409 }
    );
  }

  // Manual "Sync now" passes ?force=1 to re-run all analysis even when
  // transcripts are unchanged; incremental/auto syncs omit it.
  const force = new URL(request.url).searchParams.get("force") === "1";

  // Fire-and-forget: a full sync can run for many minutes (transcripts +
  // per-account + aggregate AI), which would blow past the platform's request
  // timeout and 502. runSync() sets the "syncing" flag synchronously before its
  // first await, so the client can poll GET /api/sync and GET /api/progress.
  void runSync(force).catch((e) => {
    console.error("[duro-tracks] Sync failed:", e);
  });

  return NextResponse.json({ started: true }, { status: 202 });
}
