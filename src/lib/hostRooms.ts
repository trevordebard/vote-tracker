"use client";

export type HostedRoom = {
  code: string;
  lastVisitedAt: string;
};

const STORAGE_KEY = "vote-tracker:hosted-rooms";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

const isBrowser = () => typeof window !== "undefined";

const normalizeCode = (code: string) => code.trim().toUpperCase();

const parseRooms = (raw: string | null): HostedRoom[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is { code?: unknown; lastVisitedAt?: unknown } =>
        Boolean(item) && typeof item === "object"
      )
      .map((item) => ({
        code: typeof item.code === "string" ? normalizeCode(item.code) : "",
        lastVisitedAt:
          typeof item.lastVisitedAt === "string" ? item.lastVisitedAt : "",
      }))
      .filter((item) => item.code && item.lastVisitedAt);
  } catch {
    return [];
  }
};

const isFresh = (entry: HostedRoom, nowMs: number) => {
  const timestamp = Date.parse(entry.lastVisitedAt);
  if (Number.isNaN(timestamp)) return false;
  return nowMs - timestamp <= MAX_AGE_MS;
};

const writeRooms = (rooms: HostedRoom[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
};

export const getHostedRooms = () => {
  if (!isBrowser()) return [] as HostedRoom[];
  const nowMs = Date.now();
  const rooms = parseRooms(window.localStorage.getItem(STORAGE_KEY)).filter(
    (entry) => isFresh(entry, nowMs)
  );
  writeRooms(rooms);
  return rooms.sort(
    (a, b) => Date.parse(b.lastVisitedAt) - Date.parse(a.lastVisitedAt)
  );
};

export const addHostedRoom = (code: string) => {
  if (!isBrowser()) return;
  const normalized = normalizeCode(code);
  if (!normalized) return;
  const now = new Date().toISOString();
  const rooms = getHostedRooms().filter((entry) => entry.code !== normalized);
  const next = [{ code: normalized, lastVisitedAt: now }, ...rooms];
  writeRooms(next);
};

export const removeHostedRoom = (code: string) => {
  if (!isBrowser()) return;
  const normalized = normalizeCode(code);
  const rooms = getHostedRooms().filter((entry) => entry.code !== normalized);
  writeRooms(rooms);
};
