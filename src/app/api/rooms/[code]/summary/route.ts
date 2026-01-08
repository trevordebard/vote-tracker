import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VoteRow = {
  voter_name: string;
  candidate_name: string;
};

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

  const votes = db
    .prepare(
      "SELECT voter_name, candidate_name FROM votes WHERE room_code = ? ORDER BY created_at DESC"
    )
    .all(code.toUpperCase()) as VoteRow[];

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
    .map(([candidateKey, data]) => ({
      candidate: data.name,
      count: data.count,
      voters: data.voters,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    room: {
      code: room.code,
      createdAt: room.created_at,
      closedAt: room.closed_at,
      candidates: room.candidates_json ? JSON.parse(room.candidates_json) : null,
    },
    tally,
    winner: tally[0] ?? null,
    totalVotes: votes.length,
  });
}
