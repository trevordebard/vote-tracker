import { NextResponse } from "next/server";
import { getRoomSummary } from "@/lib/roomSummary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const summary = getRoomSummary(code);
  if (!summary) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json(summary);
}
