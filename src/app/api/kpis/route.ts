import { NextResponse } from "next/server";
import { getKpis } from "@/lib/tab-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getKpis());
}
