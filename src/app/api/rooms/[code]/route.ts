import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parseRoleCandidates } from "@/lib/candidates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RoomRow = {
  code: string;
  created_at: string;
  closed_at: string | null;
  candidates_json: string | null;
  roles_json: string | null;
  allow_write_ins: number | null;
  allow_anonymous: number | null;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const db = getDb();
  const room = db
    .prepare(
      "SELECT code, created_at, closed_at, candidates_json, roles_json, allow_write_ins, allow_anonymous FROM rooms WHERE code = ?"
    )
    .get(code.toUpperCase()) as RoomRow | undefined;

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const roles = room.roles_json ? JSON.parse(room.roles_json) : ["General"];
  const roleCandidates = parseRoleCandidates(room.candidates_json, roles);

  return NextResponse.json({
    code: room.code,
    createdAt: room.created_at,
    closedAt: room.closed_at,
    candidates: roleCandidates ? (roleCandidates[roles[0]] ?? null) : null,
    roleCandidates,
    roles,
    allowWriteIns: room.allow_write_ins !== 0,
    allowAnonymous: room.allow_anonymous !== 0,
  });
}
