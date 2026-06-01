import { NextResponse } from "next/server";
import { queryAccountDetail } from "@/lib/tab-queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const data = queryAccountDetail(decodeURIComponent(domain));
    if (!data) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("[duro-tracks] Account detail query failed:", error);
    return NextResponse.json(
      { error: "Failed to load account" },
      { status: 500 }
    );
  }
}
