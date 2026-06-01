import { NextResponse } from "next/server";
import { resetDatabase, isSyncing } from "@/lib/db";

export async function POST() {
  if (isSyncing()) {
    return NextResponse.json(
      { error: "Cannot reset while sync is in progress" },
      { status: 409 }
    );
  }

  try {
    resetDatabase();
    return NextResponse.json({ success: true, message: "Database cleared" });
  } catch (error) {
    return NextResponse.json(
      { error: "Reset failed", details: String(error).slice(0, 500) },
      { status: 500 }
    );
  }
}
