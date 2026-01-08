import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { voteEvents } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const db = getDb();
  const room = db
    .prepare("SELECT code FROM rooms WHERE code = ?")
    .get(code.toUpperCase());

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const closedAt = new Date().toISOString();
  db.prepare("UPDATE rooms SET closed_at = ? WHERE code = ?").run(
    closedAt,
    code.toUpperCase()
  );

  voteEvents.emit("update", { code: code.toUpperCase() });

  return NextResponse.json({ closedAt });
}
