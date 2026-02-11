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

const sanitizeRoles = (roles?: unknown) => {
  if (!Array.isArray(roles)) return ["General"];
  const seen = new Set<string>();
  const cleaned: string[] = [];
  roles.forEach((role) => {
    if (typeof role !== "string") return;
    const trimmed = role.trim();
    if (!trimmed) return;
    const key = trimmed.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    cleaned.push(trimmed);
  });
  return cleaned.length ? cleaned : ["General"];
};

export async function POST(req: Request) {
  const db = getDb();
  const body = await req.json().catch(() => ({}));
  const candidates = sanitizeCandidates(body?.candidates);
  const roles = sanitizeRoles(body?.roles);
  const allowWriteIns =
    typeof body?.allowWriteIns === "boolean" ? body.allowWriteIns : true;

  let code = generateCode();
  const exists = db.prepare("SELECT 1 FROM rooms WHERE code = ?");
  while (exists.get(code)) {
    code = generateCode();
  }

  const createdAt = new Date().toISOString();
  const candidatesJson = candidates ? JSON.stringify(candidates) : null;
  const rolesJson = JSON.stringify(roles);
  db.prepare(
    "INSERT INTO rooms (code, created_at, candidates_json, roles_json, allow_write_ins) VALUES (?, ?, ?, ?, ?)"
  ).run(code, createdAt, candidatesJson, rolesJson, allowWriteIns ? 1 : 0);

  return NextResponse.json({
    code,
    createdAt,
    closedAt: null,
    candidates: candidates ?? null,
    roles,
    allowWriteIns,
  });
}
