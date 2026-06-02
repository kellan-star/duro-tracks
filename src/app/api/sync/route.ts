import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync-engine";
import { getLastSyncTimestamp, isSyncing } from "@/lib/db";

export async function GET() {
  return NextResponse.json({
    lastSyncAt: getLastSyncTimestamp(),
    isSyncing: isSyncing(),
  });
}

export async function POST() {
  if (isSyncing()) {
    return NextResponse.json(
      { error: "Sync already in progress" },
      { status: 409 }
    );
  }

  try {
    const result = await runSync();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[duro-tracks] Sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error).slice(0, 500) },
      { status: 500 }
    );
  }
}
