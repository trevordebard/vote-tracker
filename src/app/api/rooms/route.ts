import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  parseRoleCandidates,
  serializeRoleCandidates,
  type RoleCandidatesMap,
} from "@/lib/candidates";

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

const sanitizeRoleCandidates = (
  raw: unknown,
  roles: string[]
): RoleCandidatesMap | undefined => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const map: RoleCandidatesMap = {};
  let hasAny = false;
  for (const role of roles) {
    const list = sanitizeCandidates((raw as Record<string, unknown>)[role]);
    if (list) {
      map[role] = list;
      hasAny = true;
    }
  }
  return hasAny ? map : undefined;
};

export async function POST(req: Request) {
  const db = getDb();
  const body = await req.json().catch(() => ({}));
  const roles = sanitizeRoles(body?.roles);
  const allowWriteIns =
    typeof body?.allowWriteIns === "boolean" ? body.allowWriteIns : true;
  const allowAnonymous =
    typeof body?.allowAnonymous === "boolean" ? body.allowAnonymous : true;

  const perRole = sanitizeRoleCandidates(body?.roleCandidates, roles);
  const flat = sanitizeCandidates(body?.candidates);

  let candidatesJson: string | null = null;
  let roleCandidates: RoleCandidatesMap | null = null;

  if (perRole) {
    candidatesJson = serializeRoleCandidates(perRole);
    roleCandidates = perRole;
  } else if (flat) {
    candidatesJson = JSON.stringify(flat);
  }

  if (!roleCandidates && candidatesJson) {
    roleCandidates = parseRoleCandidates(candidatesJson, roles);
  }

  let code = generateCode();
  const exists = db.prepare("SELECT 1 FROM rooms WHERE code = ?");
  while (exists.get(code)) {
    code = generateCode();
  }

  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO rooms (code, created_at, candidates_json, roles_json, allow_write_ins, allow_anonymous) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(code, createdAt, candidatesJson, JSON.stringify(roles), allowWriteIns ? 1 : 0, allowAnonymous ? 1 : 0);

  const flatCandidates = roleCandidates
    ? (roleCandidates[roles[0]] ?? null)
    : (flat ?? null);

  return NextResponse.json({
    code,
    createdAt,
    closedAt: null,
    candidates: flatCandidates,
    roleCandidates,
    roles,
    allowWriteIns,
    allowAnonymous,
  });
}
