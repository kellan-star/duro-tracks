import { NextResponse } from "next/server";
import { queryValueMapTab } from "@/lib/tab-queries";

export async function GET() {
  try {
    const data = queryValueMapTab();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[duro-tracks] Value map query failed:", error);
    return NextResponse.json(
      { error: "Failed to load value map" },
      { status: 500 }
    );
  }
}
