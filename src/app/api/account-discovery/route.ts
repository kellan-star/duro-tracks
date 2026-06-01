import { NextResponse } from "next/server";
import { queryAccountDiscoveryTab } from "@/lib/tab-queries";

export async function GET() {
  try {
    const data = queryAccountDiscoveryTab();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[duro-tracks] Account discovery query failed:", error);
    return NextResponse.json(
      { error: "Failed to load account discovery" },
      { status: 500 }
    );
  }
}
