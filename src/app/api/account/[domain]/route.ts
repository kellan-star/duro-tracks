import { NextResponse } from "next/server";
import { getAccountDetail } from "@/lib/tab-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const { domain } = await params;
  const detail = getAccountDetail(decodeURIComponent(domain));
  if (!detail) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
