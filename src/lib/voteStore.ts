export type Room = {
  code: string;
  createdAt: string;
  closedAt?: string;
  candidates?: string[];
};

export type Vote = {
  id: string;
  voterName: string;
  candidateName: string;
  createdAt: string;
};

const ROOMS_KEY = "vote-tracker:rooms";
const roomVotesKey = (code: string) => `vote-tracker:votes:${code}`;
const UPDATE_EVENT = "vote-tracker-updated";

const isBrowser = () => typeof window !== "undefined";

const readJSON = <T>(key: string, fallback: T): T => {
  if (!isBrowser()) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJSON = <T>(key: string, value: T) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(UPDATE_EVENT));
};

const generateCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
};

export const getRooms = (): Room[] => readJSON<Room[]>(ROOMS_KEY, []);

export const getRoom = (code: string): Room | undefined =>
  getRooms().find((room) => room.code === code.toUpperCase());

const sanitizeCandidates = (candidates?: string[]) => {
  if (!candidates) return undefined;
  const seen = new Set<string>();
  const cleaned: string[] = [];
  candidates.forEach((candidate) => {
    const trimmed = candidate.trim();
    if (!trimmed) return;
    const key = trimmed.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    cleaned.push(trimmed);
  });
  return cleaned.length ? cleaned : undefined;
};

export const createRoom = (candidates?: string[]): Room => {
  const rooms = getRooms();
  let code = generateCode();
  while (rooms.some((room) => room.code === code)) {
    code = generateCode();
  }
  const room: Room = {
    code,
    createdAt: new Date().toISOString(),
    candidates: sanitizeCandidates(candidates),
  };
  writeJSON(ROOMS_KEY, [room, ...rooms]);
  writeJSON(roomVotesKey(code), [] as Vote[]);
  return room;
};

export const closeRoom = (code: string) => {
  const rooms = getRooms();
  const updated = rooms.map((room) =>
    room.code === code
      ? { ...room, closedAt: new Date().toISOString() }
      : room
  );
  writeJSON(ROOMS_KEY, updated);
};

export const getVotes = (code: string): Vote[] =>
  readJSON<Vote[]>(roomVotesKey(code), []);

export const addVote = (
  code: string,
  voterName: string,
  candidateName: string
): Vote => {
  const votes = getVotes(code);
  const vote: Vote = {
    id: crypto.randomUUID(),
    voterName,
    candidateName,
    createdAt: new Date().toISOString(),
  };
  writeJSON(roomVotesKey(code), [vote, ...votes]);
  return vote;
};

export type TallyEntry = {
  candidate: string;
  count: number;
  voters: string[];
};

export const getTally = (code: string): TallyEntry[] => {
  const votes = getVotes(code);
  const grouped = new Map<string, { count: number; voters: string[] }>();
  votes.forEach((vote) => {
    const key = vote.candidateName.trim().toUpperCase();
    const next = grouped.get(key) ?? { count: 0, voters: [] };
    grouped.set(key, {
      count: next.count + 1,
      voters: [vote.voterName, ...next.voters],
    });
  });
  return Array.from(grouped.entries())
    .map(([candidateKey, data]) => ({
      candidate: candidateKey,
      count: data.count,
      voters: data.voters,
    }))
    .sort((a, b) => b.count - a.count);
};

export const getWinner = (code: string) => {
  const tally = getTally(code);
  if (!tally.length) return undefined;
  return tally[0];
};

export const subscribeToUpdates = (listener: () => void) => {
  if (!isBrowser()) return () => undefined;
  const handler = () => listener();
  window.addEventListener("storage", handler);
  window.addEventListener(UPDATE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(UPDATE_EVENT, handler);
  };
};
