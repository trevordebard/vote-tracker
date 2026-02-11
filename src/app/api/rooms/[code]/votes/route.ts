import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { voteEvents } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RoomRow = {
  closed_at: string | null;
  candidates_json: string | null;
  roles_json: string | null;
  allow_write_ins: number | null;
};

type VoteInput = {
  roleName: string;
  candidateName: string;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const db = getDb();
  const room = db
    .prepare(
      "SELECT closed_at, candidates_json, roles_json, allow_write_ins FROM rooms WHERE code = ?"
    )
    .get(code.toUpperCase()) as RoomRow | undefined;

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (room.closed_at) {
    return NextResponse.json({ error: "Room closed" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const voterName = typeof body?.voterName === "string" ? body.voterName : "";
  const roomRoles = room.roles_json
    ? (JSON.parse(room.roles_json) as string[])
    : ["General"];
  const knownRoles = roomRoles.length ? roomRoles : ["General"];

  const votesInput: VoteInput[] = Array.isArray(body?.votes)
    ? body.votes
        .filter(
          (item: unknown): item is { roleName?: unknown; candidateName?: unknown } =>
            Boolean(item) && typeof item === "object"
        )
        .map((item: { roleName?: unknown; candidateName?: unknown }) => ({
          roleName: typeof item.roleName === "string" ? item.roleName.trim() : "",
          candidateName:
            typeof item.candidateName === "string" ? item.candidateName.trim() : "",
        }))
        .filter(
          (item: { roleName: string; candidateName: string }) =>
            item.roleName && item.candidateName
        )
    : [
        {
          roleName:
            typeof body?.roleName === "string" && body.roleName.trim()
              ? body.roleName.trim()
              : knownRoles[0],
          candidateName:
            typeof body?.candidateName === "string" ? body.candidateName.trim() : "",
        },
      ].filter((item: { roleName: string; candidateName: string }) => item.candidateName);

  if (!votesInput.length) {
    return NextResponse.json(
      { error: "At least one role vote is required" },
      { status: 400 }
    );
  }

  const normalizedRoles = new Set(knownRoles.map((role) => role.trim().toUpperCase()));
  const invalidRole = votesInput.find(
    (vote) => !normalizedRoles.has(vote.roleName.trim().toUpperCase())
  );
  if (invalidRole) {
    return NextResponse.json(
      { error: `Unknown role: ${invalidRole.roleName}` },
      { status: 400 }
    );
  }

  const allowWriteIns = room.allow_write_ins !== 0;
  const candidates = room.candidates_json
    ? (JSON.parse(room.candidates_json) as string[])
    : [];
  if (!allowWriteIns) {
    for (const vote of votesInput) {
      const normalizedCandidate = vote.candidateName.trim().toUpperCase();
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
  }

  const resolvedVoterName = voterName.trim() || "Anonymous";
  const roomCode = code.toUpperCase();
  const insertVote = db.prepare(
    "INSERT INTO votes (id, room_code, voter_name, candidate_name, role_name, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const submitMany = db.transaction((entries: VoteInput[]) => {
    return entries.map((entry) => {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      insertVote.run(
        id,
        roomCode,
        resolvedVoterName,
        entry.candidateName.trim(),
        entry.roleName.trim(),
        createdAt
      );
      return {
        id,
        voterName: resolvedVoterName,
        roleName: entry.roleName.trim(),
        candidateName: entry.candidateName.trim(),
        createdAt,
      };
    });
  });
  const insertedVotes = submitMany(votesInput);

  voteEvents.emit("update", { code: roomCode });

  if (
    insertedVotes.length === 1 &&
    !Array.isArray(body?.votes) &&
    typeof body?.candidateName === "string"
  ) {
    return NextResponse.json(insertedVotes[0]);
  }

  return NextResponse.json({
    voterName: resolvedVoterName,
    votes: insertedVotes,
  });
}
