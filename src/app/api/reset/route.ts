import { NextResponse } from "next/server";
import { resetDatabase, isSyncing } from "@/lib/db";
import { isAdminAuthConfigured, requireAdmin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  // Destructive and never called from the UI: stay unroutable unless an admin
  // token is configured, then require it.
  if (!isAdminAuthConfigured()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const denied = requireAdmin(request);
  if (denied) return denied;

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
