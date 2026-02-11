import { getDb } from "@/lib/db";
import type { RoleSummary, Room, TallyEntry } from "@/lib/types";

type VoteRow = {
  voter_name: string;
  candidate_name: string;
  role_name: string;
};

type RoomRow = {
  code: string;
  created_at: string;
  closed_at: string | null;
  candidates_json: string | null;
  roles_json: string | null;
  allow_write_ins: number | null;
};

type RoomSummary = {
  room: Room;
  roleTallies: RoleSummary[];
  totalVotes: number;
};

const normalize = (value: string) => value.trim().toUpperCase();

const parseRoles = (rolesJson: string | null) => {
  if (!rolesJson) return ["General"];
  const parsed = JSON.parse(rolesJson) as unknown;
  if (!Array.isArray(parsed)) return ["General"];
  const roles = parsed
    .filter((role): role is string => typeof role === "string")
    .map((role) => role.trim())
    .filter(Boolean);
  return roles.length ? roles : ["General"];
};

export const getRoomSummary = (code: string): RoomSummary | null => {
  const db = getDb();
  const normalized = code.toUpperCase();
  const room = db
    .prepare(
      "SELECT code, created_at, closed_at, candidates_json, roles_json, allow_write_ins FROM rooms WHERE code = ?"
    )
    .get(normalized) as RoomRow | undefined;

  if (!room) return null;

  const votes = db
    .prepare(
      "SELECT voter_name, candidate_name, role_name FROM votes WHERE room_code = ? ORDER BY created_at DESC"
    )
    .all(normalized) as VoteRow[];
  const roles = parseRoles(room.roles_json);
  const roleMap = new Map<
    string,
    { role: string; grouped: Map<string, { name: string; count: number; voters: string[] }> }
  >(
    roles.map((role) => [
      normalize(role),
      { role, grouped: new Map<string, { name: string; count: number; voters: string[] }>() },
    ])
  );

  votes.forEach((vote) => {
    const roleName = vote.role_name?.trim() || "General";
    const roleKey = normalize(roleName);
    const roleEntry = roleMap.get(roleKey) ?? {
      role: roleName,
      grouped: new Map<string, { name: string; count: number; voters: string[] }>(),
    };
    if (!roleMap.has(roleKey)) {
      roleMap.set(roleKey, roleEntry);
    }
    const trimmed = vote.candidate_name.trim();
    const candidateKey = normalize(trimmed);
    const existing = roleEntry.grouped.get(candidateKey) ?? {
      name: trimmed,
      count: 0,
      voters: [],
    };
    roleEntry.grouped.set(candidateKey, {
      name: existing.name,
      count: existing.count + 1,
      voters: [vote.voter_name, ...existing.voters],
    });
  });

  const roleTallies: RoleSummary[] = Array.from(roleMap.values()).map((entry) => {
    const tally: TallyEntry[] = Array.from(entry.grouped.entries())
      .map(([, data]) => ({
        candidate: data.name,
        count: data.count,
        voters: data.voters,
      }))
      .sort((a, b) => b.count - a.count);
    return {
      role: entry.role,
      tally,
      winner: tally[0] ?? null,
      totalVotes: tally.reduce((total, item) => total + item.count, 0),
    };
  });

  return {
    room: {
      code: room.code,
      createdAt: room.created_at,
      closedAt: room.closed_at,
      candidates: room.candidates_json ? JSON.parse(room.candidates_json) : null,
      roles,
      allowWriteIns: room.allow_write_ins !== 0,
    },
    roleTallies,
    totalVotes: votes.length,
  };
};
