import { getDb } from "@/lib/db";
import type { Room, TallyEntry } from "@/lib/types";

type VoteRow = {
  voter_name: string;
  candidate_name: string;
};

type RoomRow = {
  code: string;
  created_at: string;
  closed_at: string | null;
  candidates_json: string | null;
  allow_write_ins: number | null;
};

type RoomSummary = {
  room: Room;
  tally: TallyEntry[];
  winner: TallyEntry | null;
  totalVotes: number;
};

export const getRoomSummary = (code: string): RoomSummary | null => {
  const db = getDb();
  const normalized = code.toUpperCase();
  const room = db
    .prepare(
      "SELECT code, created_at, closed_at, candidates_json, allow_write_ins FROM rooms WHERE code = ?"
    )
    .get(normalized) as RoomRow | undefined;

  if (!room) return null;

  const votes = db
    .prepare(
      "SELECT voter_name, candidate_name FROM votes WHERE room_code = ? ORDER BY created_at DESC"
    )
    .all(normalized) as VoteRow[];

  const grouped = new Map<
    string,
    { name: string; count: number; voters: string[] }
  >();
  votes.forEach((vote) => {
    const trimmed = vote.candidate_name.trim();
    const key = trimmed.toUpperCase();
    const existing = grouped.get(key) ?? {
      name: trimmed,
      count: 0,
      voters: [],
    };
    grouped.set(key, {
      name: existing.name,
      count: existing.count + 1,
      voters: [vote.voter_name, ...existing.voters],
    });
  });

  const tally = Array.from(grouped.entries())
    .map(([, data]) => ({
      candidate: data.name,
      count: data.count,
      voters: data.voters,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    room: {
      code: room.code,
      createdAt: room.created_at,
      closedAt: room.closed_at,
      candidates: room.candidates_json ? JSON.parse(room.candidates_json) : null,
      allowWriteIns: room.allow_write_ins !== 0,
    },
    tally,
    winner: tally[0] ?? null,
    totalVotes: votes.length,
  };
};
