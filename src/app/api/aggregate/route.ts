import { NextResponse } from "next/server";
import { runAggregateAnalysis } from "@/lib/aggregate-analyzer";
import { isSyncing } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/aggregate — re-run ONLY the cross-account (Account Discovery / Value
// Map / MEDDPICC) aggregates over the existing per-account analyses. Fast (3 AI
// calls, ~40s) and cheap — lets us iterate on aggregate prompts/thresholds
// without re-analyzing every account.
export async function POST() {
  if (isSyncing()) {
    return NextResponse.json({ error: "Sync in progress" }, { status: 409 });
  }
  try {
    await runAggregateAnalysis();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[duro-tracks] Aggregate refresh failed:", error);
    return NextResponse.json(
      { error: "Aggregate failed", details: String(error).slice(0, 500) },
      { status: 500 }
    );
  }
}
