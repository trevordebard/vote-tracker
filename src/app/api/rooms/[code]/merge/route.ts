import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { voteEvents } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalize = (value: string) => value.trim().toUpperCase();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const db = getDb();
  const roomCode = code.toUpperCase();

  const room = db
    .prepare("SELECT candidates_json FROM rooms WHERE code = ?")
    .get(roomCode);

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const sources = Array.isArray(body?.sourceCandidates)
    ? body.sourceCandidates
    : [];
  const target = typeof body?.targetCandidate === "string"
    ? body.targetCandidate
    : "";

  const cleanedSources = sources
    .filter((item: unknown) => typeof item === "string")
    .map((item: string) => item.trim())
    .filter(Boolean);

  const cleanedTarget = target.trim();

  if (cleanedSources.length < 2 || !cleanedTarget) {
    return NextResponse.json(
      { error: "Need at least two source candidates and a target" },
      { status: 400 }
    );
  }

  const normalizedSources = Array.from(
    new Set(cleanedSources.map((item) => normalize(item)))
  );

  db.prepare(
    `UPDATE votes
     SET candidate_name = ?
     WHERE room_code = ?
       AND UPPER(TRIM(candidate_name)) IN (${normalizedSources
         .map(() => "?")
         .join(",")})`
  ).run(cleanedTarget, roomCode, ...normalizedSources);

  if (room.candidates_json) {
    const candidates = JSON.parse(room.candidates_json) as string[];
    const normalizedTarget = normalize(cleanedTarget);
    const updated = candidates.filter(
      (name) => !normalizedSources.includes(normalize(name))
    );
    if (!updated.some((name) => normalize(name) === normalizedTarget)) {
      updated.push(cleanedTarget);
    }
    db.prepare("UPDATE rooms SET candidates_json = ? WHERE code = ?").run(
      JSON.stringify(updated),
      roomCode
    );
  }

  voteEvents.emit("update", { code: roomCode });

  return NextResponse.json({ mergedInto: cleanedTarget });
}
