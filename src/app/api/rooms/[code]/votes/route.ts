import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { voteEvents } from "@/lib/events";
import { parseRoleCandidates } from "@/lib/candidates";

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

type RouteCtx = { params: Promise<{ code: string }> };

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

function getOpenRoom(roomCode: string) {
  const db = getDb();
  const room = db
    .prepare(
      "SELECT closed_at, candidates_json, roles_json, allow_write_ins FROM rooms WHERE code = ?"
    )
    .get(roomCode) as RoomRow | undefined;

  if (!room) {
    return { error: NextResponse.json({ error: "Room not found" }, { status: 404 }) };
  }
  if (room.closed_at) {
    return { error: NextResponse.json({ error: "Room closed" }, { status: 403 }) };
  }
  return { room };
}

function parseVotesInput(body: Record<string, unknown>, knownRoles: string[]): VoteInput[] {
  if (Array.isArray(body?.votes)) {
    return body.votes
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
      );
  }
  return [
    {
      roleName:
        typeof body?.roleName === "string" && body.roleName.trim()
          ? (body.roleName as string).trim()
          : knownRoles[0],
      candidateName:
        typeof body?.candidateName === "string" ? (body.candidateName as string).trim() : "",
    },
  ].filter((item) => item.candidateName);
}

function validateVotes(
  votesInput: VoteInput[],
  room: RoomRow,
  knownRoles: string[]
): NextResponse | null {
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
  const roleCandidates = parseRoleCandidates(room.candidates_json, knownRoles);
  if (!allowWriteIns && roleCandidates) {
    for (const vote of votesInput) {
      const roleCands = roleCandidates[vote.roleName] ?? [];
      const normalizedCandidate = vote.candidateName.trim().toUpperCase();
      const isValid = roleCands.some(
        (candidate) => candidate.trim().toUpperCase() === normalizedCandidate
      );
      if (!isValid) {
        return NextResponse.json(
          { error: `Write-in candidates are not allowed for role "${vote.roleName}"` },
          { status: 400 }
        );
      }
    }
  }

  return null;
}

function insertVotes(roomCode: string, resolvedVoterName: string, votesInput: VoteInput[]) {
  const db = getDb();
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
  return submitMany(votesInput);
}

/* ------------------------------------------------------------------ */
/*  POST – submit new votes                                            */
/* ------------------------------------------------------------------ */

export async function POST(req: Request, { params }: RouteCtx) {
  const { code } = await params;
  const roomCode = code.toUpperCase();

  const { room, error: roomError } = getOpenRoom(roomCode);
  if (roomError) return roomError;

  const body = await req.json().catch(() => ({}));
  const voterName = typeof body?.voterName === "string" ? body.voterName : "";
  const knownRoles = room.roles_json
    ? (JSON.parse(room.roles_json) as string[])
    : ["General"];
  const roles = knownRoles.length ? knownRoles : ["General"];

  const votesInput = parseVotesInput(body, roles);
  const validationError = validateVotes(votesInput, room, roles);
  if (validationError) return validationError;

  const resolvedVoterName = voterName.trim() || "Anonymous";
  const insertedVotes = insertVotes(roomCode, resolvedVoterName, votesInput);

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

/* ------------------------------------------------------------------ */
/*  PUT – update existing votes                                        */
/* ------------------------------------------------------------------ */

export async function PUT(req: Request, { params }: RouteCtx) {
  const { code } = await params;
  const roomCode = code.toUpperCase();

  const { room, error: roomError } = getOpenRoom(roomCode);
  if (roomError) return roomError;

  const body = await req.json().catch(() => ({}));
  const voterName = typeof body?.voterName === "string" ? body.voterName : "";
  const knownRoles = room.roles_json
    ? (JSON.parse(room.roles_json) as string[])
    : ["General"];
  const roles = knownRoles.length ? knownRoles : ["General"];

  // Validate voteIds
  const voteIds: string[] = Array.isArray(body?.voteIds)
    ? body.voteIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
    : [];

  if (!voteIds.length) {
    return NextResponse.json(
      { error: "voteIds array is required for updating votes" },
      { status: 400 }
    );
  }

  // Verify all vote IDs exist for this room
  const db = getDb();
  const placeholders = voteIds.map(() => "?").join(", ");
  const existingVotes = db
    .prepare(
      `SELECT id FROM votes WHERE id IN (${placeholders}) AND room_code = ?`
    )
    .all(...voteIds, roomCode) as { id: string }[];

  if (existingVotes.length !== voteIds.length) {
    return NextResponse.json(
      { error: "One or more vote IDs not found in this room" },
      { status: 404 }
    );
  }

  const votesInput = parseVotesInput(body, roles);
  const validationError = validateVotes(votesInput, room, roles);
  if (validationError) return validationError;

  const resolvedVoterName = voterName.trim() || "Anonymous";

  // Delete old votes and insert new ones in a transaction
  const deleteStmt = db.prepare(
    `DELETE FROM votes WHERE id IN (${placeholders}) AND room_code = ?`
  );
  const insertVote = db.prepare(
    "INSERT INTO votes (id, room_code, voter_name, candidate_name, role_name, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const updateVotes = db.transaction(() => {
    deleteStmt.run(...voteIds, roomCode);
    return votesInput.map((entry) => {
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

  const updatedVotes = updateVotes();
  voteEvents.emit("update", { code: roomCode });

  return NextResponse.json({
    voterName: resolvedVoterName,
    votes: updatedVotes,
  });
}
