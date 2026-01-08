import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateCode = () => {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
};

const sanitizeCandidates = (candidates?: unknown) => {
  if (!Array.isArray(candidates)) return undefined;
  const seen = new Set<string>();
  const cleaned: string[] = [];
  candidates.forEach((candidate) => {
    if (typeof candidate !== "string") return;
    const trimmed = candidate.trim();
    if (!trimmed) return;
    const key = trimmed.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    cleaned.push(trimmed);
  });
  return cleaned.length ? cleaned : undefined;
};

export async function POST(req: Request) {
  const db = getDb();
  const body = await req.json().catch(() => ({}));
  const candidates = sanitizeCandidates(body?.candidates);

  let code = generateCode();
  const exists = db.prepare("SELECT 1 FROM rooms WHERE code = ?");
  while (exists.get(code)) {
    code = generateCode();
  }

  const createdAt = new Date().toISOString();
  const candidatesJson = candidates ? JSON.stringify(candidates) : null;
  db.prepare(
    "INSERT INTO rooms (code, created_at, candidates_json) VALUES (?, ?, ?)"
  ).run(code, createdAt, candidatesJson);

  return NextResponse.json({
    code,
    createdAt,
    closedAt: null,
    candidates: candidates ?? null,
  });
}
