import { NextResponse } from "next/server";
import {
  getDiscoveryInsights,
  getMeddpiccInsights,
  getValueMapInsights,
} from "@/lib/tab-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ framework: string }> },
) {
  const { framework } = await params;
  switch (framework) {
    case "discovery":
      return NextResponse.json({ insights: getDiscoveryInsights() });
    case "valuemap":
      return NextResponse.json({ insights: getValueMapInsights() });
    case "meddpicc":
      return NextResponse.json({ insights: getMeddpiccInsights() });
    default:
      return NextResponse.json({ error: "Unknown framework" }, { status: 404 });
  }
}
