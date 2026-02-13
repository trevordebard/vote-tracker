"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Shell from "@/components/Shell";
import ChipInput from "@/components/ChipInput";
import { addHostedRoom } from "@/lib/hostRooms";
import type { RoleCandidatesMap } from "@/lib/types";

export default function HostLanding() {
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>([]);
  const [perRoleCandidates, setPerRoleCandidates] = useState<
    Record<string, string[]>
  >({});
  const [useSameAsFirst, setUseSameAsFirst] = useState<
    Record<string, boolean>
  >({});
  const [existingRoomCode, setExistingRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [allowWriteIns, setAllowWriteIns] = useState(true);
  const [allowAnonymous, setAllowAnonymous] = useState(true);

  const firstRole = roles[0] ?? "";
  const firstRoleCandidates = perRoleCandidates[firstRole] ?? [];

  const getEffectiveCandidates = (role: string) => {
    if (role === firstRole) return perRoleCandidates[role] ?? [];
    if (useSameAsFirst[role] !== false) return firstRoleCandidates;
    return perRoleCandidates[role] ?? [];
  };

  const canCreate =
    roles.length > 0 &&
    roles.every((role) => {
      const cands = getEffectiveCandidates(role);
      return allowWriteIns || cands.length > 0;
    });
  const canOpenExisting = existingRoomCode.trim().length > 0;
  const hasRoles = roles.length > 0;

  const handleCreate = async () => {
    if (isCreating || !canCreate) return;
    setIsCreating(true);

    const roleCandidates: RoleCandidatesMap = {};
    let hasAnyCandidates = false;
    for (const role of roles) {
      const cands = getEffectiveCandidates(role);
      if (cands.length > 0) {
        roleCandidates[role] = cands;
        hasAnyCandidates = true;
      }
    }

    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roles,
        roleCandidates: hasAnyCandidates ? roleCandidates : undefined,
        allowWriteIns,
        allowAnonymous,
      }),
    });
    setIsCreating(false);
    if (!response.ok) return;
    const room = await response.json();
    router.push(`/host/${room.code}`);
  };

  const updateRoleCandidates = (role: string, values: string[]) => {
    setPerRoleCandidates((prev) => ({ ...prev, [role]: values }));
  };

  return (
    <Shell>
      <main className="flex flex-col gap-6">
        <section className="grid items-start gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="panel flex flex-col gap-8 p-8 reveal">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted">New room</p>
              <h1 className="text-3xl font-[family:var(--font-display)] text-ink sm:text-4xl">
                Create a room, then share the voter link.
              </h1>
              <p className="text-muted">
                Set up your room in three quick steps.
              </p>
            </div>

            {/* Step 1: Roles */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-medium text-on-ink">
                  1
                </span>
                <label className="text-sm font-medium text-ink">
                  Define roles to vote for
                </label>
              </div>
              <div className="ml-10">
                <ChipInput
                  values={roles}
                  onChange={setRoles}
                  placeholder="e.g. Secretary"
                />
                <p className="mt-2 text-xs text-muted">
                  Press Enter or comma to add each role.
                </p>
              </div>
            </div>

            {/* Step 2: Options — revealed after roles exist */}
            <div
              className={`flex flex-col gap-3 transition-all duration-500 ${
                hasRoles
                  ? "opacity-100"
                  : "pointer-events-none max-h-0 overflow-hidden opacity-0"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-medium text-on-ink">
                  2
                </span>
                <label className="text-sm font-medium text-ink">
                  Room options
                </label>
              </div>
              <div className="ml-10 flex flex-col gap-2">
                <label className="surface-soft flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={allowWriteIns}
                    onChange={(event) =>
                      setAllowWriteIns(event.target.checked)
                    }
                  />
                  <span>
                    Allow write-in candidates
                    <span className="ml-2 text-xs text-muted">
                      — voters can suggest names not on your list
                    </span>
                  </span>
                </label>
                <label className="surface-soft flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={allowAnonymous}
                    onChange={(event) =>
                      setAllowAnonymous(event.target.checked)
                    }
                  />
                  <span>
                    Allow anonymous voting
                    <span className="ml-2 text-xs text-muted">
                      — voters won&apos;t need to enter their name
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* Step 3: Candidates per role — revealed after roles exist */}
            <div
              className={`flex flex-col gap-3 transition-all duration-500 ${
                hasRoles
                  ? "opacity-100"
                  : "pointer-events-none max-h-0 overflow-hidden opacity-0"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-medium text-on-ink">
                  3
                </span>
                <label className="text-sm font-medium text-ink">
                  Add candidates{" "}
                  <span className="font-normal text-muted">(optional)</span>
                </label>
              </div>
              <div className="ml-10 flex flex-col gap-4">
                {roles.map((role, index) => {
                  const isFirst = index === 0;
                  const usesSame =
                    !isFirst && useSameAsFirst[role] !== false;

                  return (
                    <div
                      key={role}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-ink">{role}</p>
                        {!isFirst && (
                          <label className="flex items-center gap-2 text-xs text-muted">
                            <input
                              type="checkbox"
                              checked={usesSame}
                              onChange={(e) =>
                                setUseSameAsFirst((prev) => ({
                                  ...prev,
                                  [role]: e.target.checked,
                                }))
                              }
                            />
                            Same as {firstRole}
                          </label>
                        )}
                      </div>
                      {usesSame && !isFirst ? (
                        <p className="text-xs text-muted">
                          {firstRoleCandidates.length > 0
                            ? `Using: ${firstRoleCandidates.join(", ")}`
                            : "No candidates set yet."}
                        </p>
                      ) : (
                        <ChipInput
                          values={perRoleCandidates[role] ?? []}
                          onChange={(values) =>
                            updateRoleCandidates(role, values)
                          }
                          placeholder="Type a name and press Enter"
                        />
                      )}
                    </div>
                  );
                })}
                <p className="text-xs text-muted">
                  {!allowWriteIns &&
                  roles.some(
                    (role) => getEffectiveCandidates(role).length === 0
                  )
                    ? "Each role needs at least one candidate when write-ins are disabled."
                    : "Press Enter or comma to add each name. Leave blank to accept only write-ins."}
                </p>
              </div>
            </div>

            {/* Create button — revealed after roles exist */}
            <div
              className={`flex flex-col gap-3 transition-all duration-500 ${
                hasRoles
                  ? "opacity-100"
                  : "pointer-events-none max-h-0 overflow-hidden opacity-0"
              }`}
            >
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating || !canCreate}
                className="cta-primary rounded-2xl px-4 py-3 text-sm uppercase tracking-[0.3em] transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-60"
              >
                {isCreating ? "Creating..." : "Create room"}
              </button>
              <p className="text-xs text-muted">
                You&apos;ll get one shareable voter link and live results per
                role.
              </p>
            </div>
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
