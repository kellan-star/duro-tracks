import { NextResponse } from "next/server";
import { resetDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/reset — clear all database tables.
export function POST() {
  resetDb();
  return NextResponse.json({ ok: true });
}
