"use client";

export type VotedRoom = {
  code: string;
  voterName: string;
  voteIds: string[];
  votes: { roleName: string; candidateName: string }[];
  lastVotedAt: string;
};

const STORAGE_KEY = "vote-tracker:voted-rooms";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

const isBrowser = () => typeof window !== "undefined";

const normalizeCode = (code: string) => code.trim().toUpperCase();

const parseRooms = (raw: string | null): VotedRoom[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object"
      )
      .map((item) => ({
        code: typeof item.code === "string" ? normalizeCode(item.code) : "",
        voterName: typeof item.voterName === "string" ? item.voterName : "",
        voteIds: Array.isArray(item.voteIds)
          ? item.voteIds.filter((id: unknown): id is string => typeof id === "string")
          : [],
        votes: Array.isArray(item.votes)
          ? item.votes
              .filter(
                (v: unknown): v is { roleName: string; candidateName: string } =>
                  Boolean(v) &&
                  typeof v === "object" &&
                  typeof (v as Record<string, unknown>).roleName === "string" &&
                  typeof (v as Record<string, unknown>).candidateName === "string"
              )
              .map((v: { roleName: string; candidateName: string }) => ({
                roleName: v.roleName,
                candidateName: v.candidateName,
              }))
          : [],
        lastVotedAt:
          typeof item.lastVotedAt === "string" ? item.lastVotedAt : "",
      }))
      .filter((item) => item.code && item.lastVotedAt && item.voteIds.length > 0);
  } catch {
    return [];
  }
};

const isFresh = (entry: VotedRoom, nowMs: number) => {
  const timestamp = Date.parse(entry.lastVotedAt);
  if (Number.isNaN(timestamp)) return false;
  return nowMs - timestamp <= MAX_AGE_MS;
};

const writeRooms = (rooms: VotedRoom[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
};

export const getVotedRooms = () => {
  if (!isBrowser()) return [] as VotedRoom[];
  const nowMs = Date.now();
  const rooms = parseRooms(window.localStorage.getItem(STORAGE_KEY)).filter(
    (entry) => isFresh(entry, nowMs)
  );
  writeRooms(rooms);
  return rooms.sort(
    (a, b) => Date.parse(b.lastVotedAt) - Date.parse(a.lastVotedAt)
  );
};

export const addVotedRoom = (room: VotedRoom) => {
  if (!isBrowser()) return;
  const normalized = normalizeCode(room.code);
  if (!normalized) return;
  const rooms = getVotedRooms().filter((entry) => entry.code !== normalized);
  const next = [{ ...room, code: normalized, lastVotedAt: new Date().toISOString() }, ...rooms];
  writeRooms(next);
};

export const removeVotedRoom = (code: string) => {
  if (!isBrowser()) return;
  const normalized = normalizeCode(code);
  const rooms = getVotedRooms().filter((entry) => entry.code !== normalized);
  writeRooms(rooms);
};

export const getVotedRoom = (code: string): VotedRoom | undefined => {
  const normalized = normalizeCode(code);
  return getVotedRooms().find((entry) => entry.code === normalized);
};
