"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Shell from "@/components/Shell";
import { addHostedRoom } from "@/lib/hostRooms";

export default function HostLanding() {
  const router = useRouter();
  const [candidatesText, setCandidatesText] = useState("");
  const [rolesText, setRolesText] = useState("General");
  const [existingRoomCode, setExistingRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [allowWriteIns, setAllowWriteIns] = useState(true);
  const [allowAnonymous, setAllowAnonymous] = useState(true);

  const candidates = candidatesText
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const roles = rolesText
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const canCreate = allowWriteIns || candidates.length > 0;
  const canOpenExisting = existingRoomCode.trim().length > 0;

  const handleCreate = async () => {
    if (isCreating) return;
    if (!canCreate) return;
    if (roles.length === 0) return;
    setIsCreating(true);
    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidates, roles, allowWriteIns, allowAnonymous }),
    });
    setIsCreating(false);
    if (!response.ok) return;
    const room = await response.json();
    router.push(`/host/${room.code}`);
  };

  return (
    <Shell>
      <main className="flex flex-col gap-6">
        <section className="grid items-start gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="panel flex flex-col gap-6 p-8 reveal">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted">New room</p>
              <h1 className="text-3xl font-[family:var(--font-display)] text-ink sm:text-4xl">
                Create a room, then share the voter link.
              </h1>
              <p className="text-muted">
                Define the roles being voted on, optionally add a candidate
                list, and open one live dashboard for all results.
              </p>
            </div>
            <div className="flex flex-col gap-3 text-xs text-muted">
              <label className="uppercase tracking-[0.3em]">
                Roles to vote for
              </label>
              <textarea
                value={rolesText}
                onChange={(event) => setRolesText(event.target.value)}
                placeholder="Secretary, Facilitator"
                rows={3}
                className="surface-soft rounded-2xl border border-border px-4 py-3 text-sm text-ink outline-none transition focus:border-ink"
              />
              <p>Separate roles with commas or new lines.</p>
            </div>
            <label className="surface-soft flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={allowWriteIns}
                onChange={(event) => setAllowWriteIns(event.target.checked)}
              />
              Allow write-in candidates
            </label>
            <label className="surface-soft flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={allowAnonymous}
                onChange={(event) => setAllowAnonymous(event.target.checked)}
              />
              Allow anonymous voting
            </label>
            <div className="flex flex-col gap-3 text-xs text-muted">
              <label className="uppercase tracking-[0.3em]">
                Candidate list (optional)
              </label>
              <textarea
                value={candidatesText}
                onChange={(event) => setCandidatesText(event.target.value)}
                placeholder="Add candidate names"
                rows={4}
                className="surface-soft rounded-2xl border border-border px-4 py-3 text-sm text-ink outline-none transition focus:border-ink"
              />
              <p>Example: Alex Kim, Jordan Lee, Sam Patel</p>
              <p>Separate names with commas or new lines.</p>
            </div>
            {!allowWriteIns && candidates.length === 0 ? (
              <p className="text-xs text-muted">
                Add at least one candidate when write-ins are disabled.
              </p>
            ) : roles.length === 0 ? (
              <p className="text-xs text-muted">
                Add at least one role before creating the room.
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating || !canCreate || roles.length === 0}
              className="cta-primary rounded-2xl px-4 py-3 text-sm uppercase tracking-[0.3em] transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-60"
            >
              {isCreating ? "Creating..." : "Create room"}
            </button>
            <p className="text-xs text-muted">
              You&apos;ll get one shareable voter link and live results per
              role.
            </p>
          </div>

          <div className="panel flex flex-col gap-4 p-8 reveal reveal-delay-1">
            <p className="text-sm text-muted">Existing room</p>
            <h2 className="text-2xl font-[family:var(--font-display)] text-ink">
              Rejoin a dashboard.
            </h2>
            <p className="text-sm text-muted">
              Already have a room code? Jump straight back to your host view.
            </p>
            <div className="flex flex-col gap-3">
              <input
                value={existingRoomCode}
                onChange={(event) => {
                  const sanitized = event.target.value
                    .replace(/\s+/g, "")
                    .toUpperCase();
                  setExistingRoomCode(sanitized);
                }}
                placeholder="ABC123"
                className="surface-soft rounded-2xl border border-border px-4 py-3 text-sm uppercase tracking-[0.2em] text-ink outline-none transition focus:border-ink"
              />
              <button
                type="button"
                onClick={() => {
                  const normalized = existingRoomCode.trim().toUpperCase();
                  if (!normalized) return;
                  addHostedRoom(normalized);
                  router.push(`/host/${normalized}`);
                }}
                disabled={!canOpenExisting}
                className="cta-primary rounded-2xl px-4 py-3 text-xs uppercase tracking-[0.3em] transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-60"
              >
                Open dashboard
              </button>
            </div>
          </div>
        </section>
      </main>
    </Shell>
  );
}
