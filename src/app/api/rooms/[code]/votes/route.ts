import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { voteEvents } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RoomRow = {
  closed_at: string | null;
  candidates_json: string | null;
  allow_write_ins: number | null;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const db = getDb();
  const room = db
    .prepare("SELECT closed_at, candidates_json, allow_write_ins FROM rooms WHERE code = ?")
    .get(code.toUpperCase()) as RoomRow | undefined;

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (room.closed_at) {
    return NextResponse.json({ error: "Room closed" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const voterName = typeof body?.voterName === "string" ? body.voterName : "";
  const candidateName =
    typeof body?.candidateName === "string" ? body.candidateName : "";

  if (!voterName.trim() || !candidateName.trim()) {
    return NextResponse.json(
      { error: "Voter name and candidate are required" },
      { status: 400 }
    );
  }

  const allowWriteIns = room.allow_write_ins !== 0;
  if (!allowWriteIns) {
    const candidates = room.candidates_json
      ? (JSON.parse(room.candidates_json) as string[])
      : [];
    const normalizedCandidate = candidateName.trim().toUpperCase();
    const isValid = candidates.some(
      (candidate) => candidate.trim().toUpperCase() === normalizedCandidate
    );
    if (!isValid) {
      return NextResponse.json(
        { error: "Write-in candidates are not allowed for this room" },
        { status: 400 }
      );
    }
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(
    "INSERT INTO votes (id, room_code, voter_name, candidate_name, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(
    id,
    code.toUpperCase(),
    voterName.trim(),
    candidateName.trim(),
    createdAt
  );

  voteEvents.emit("update", { code: code.toUpperCase() });

  return NextResponse.json({
    id,
    voterName: voterName.trim(),
    candidateName: candidateName.trim(),
    createdAt,
  });
}
