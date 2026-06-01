import { NextResponse } from "next/server";
import { queryMeddpiccTab } from "@/lib/tab-queries";

export async function GET() {
  try {
    const data = queryMeddpiccTab();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[duro-tracks] MEDDPICC query failed:", error);
    return NextResponse.json(
      { error: "Failed to load MEDDPICC data" },
      { status: 500 }
    );
  }
}
