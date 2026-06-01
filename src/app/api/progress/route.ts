import { NextResponse } from "next/server";
import { getProgress } from "@/lib/sync-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/progress — poll sync progress.
export function GET() {
  return NextResponse.json(getProgress());
}
