import { NextResponse } from "next/server";
import { querySalesRepsTab } from "@/lib/tab-queries";

export async function GET() {
  try {
    const data = querySalesRepsTab();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[duro-tracks] Sales reps query failed:", error);
    return NextResponse.json(
      { error: "Failed to load sales reps" },
      { status: 500 }
    );
  }
}
