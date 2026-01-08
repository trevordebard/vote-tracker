import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const db = getDb();
  const room = db
    .prepare(
      "SELECT code, created_at, closed_at, candidates_json FROM rooms WHERE code = ?"
    )
    .get(code.toUpperCase());

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json({
    code: room.code,
    createdAt: room.created_at,
    closedAt: room.closed_at,
    candidates: room.candidates_json ? JSON.parse(room.candidates_json) : null,
  });
}
