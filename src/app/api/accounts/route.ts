import { NextResponse } from "next/server";
import { queryAccountsTab } from "@/lib/tab-queries";

export async function GET() {
  try {
    const data = queryAccountsTab();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[duro-tracks] Accounts query failed:", error);
    return NextResponse.json(
      { error: "Failed to load accounts" },
      { status: 500 }
    );
  }
}
