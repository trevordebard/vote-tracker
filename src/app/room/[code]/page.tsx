"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Shell from "@/components/Shell";
import type { Room } from "@/lib/types";
import { addVotedRoom, getVotedRoom, removeVotedRoom, type VotedRoom } from "@/lib/votedRooms";
import { getVoterName, setVoterName as persistVoterName } from "@/lib/voterName";

type VoteResponse = {
  voterName: string;
  votes: { id: string; roleName: string; candidateName: string }[];
};

export default function VoterRoom() {
  const params = useParams();
  const code = useMemo(
    () => (Array.isArray(params.code) ? params.code[0] : params.code),
    [params.code]
  );
  const normalized = (code ?? "").toUpperCase();
  const [room, setRoom] = useState<Room | undefined>();
  const [name, setName] = useState("");
  const [roleCandidates, setRoleCandidates] = useState<Record<string, string>>({});
  const [roleOption, setRoleOption] = useState<Record<string, string>>({});
  const [roleWriteIns, setRoleWriteIns] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingVoteIds, setExistingVoteIds] = useState<string[]>([]);
  const [savedVotes, setSavedVotes] = useState<VotedRoom["votes"]>([]);
  const [savedVoterName, setSavedVoterName] = useState("");
  const restoredRef = useRef(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch(`/api/rooms/${normalized}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      setRoom(undefined);
      setIsLoading(false);
      return;
    }
    const data = (await response.json()) as Room;
    setRoom(data);
    setIsLoading(false);
  }, [normalized]);

  useEffect(() => {
    if (!normalized) return;
    const timeoutId = setTimeout(() => {
      void refresh();
    }, 0);
    const source = new EventSource(`/api/rooms/${normalized}/stream`);
    source.onmessage = () => {
      void refresh();
    };
    source.onerror = () => {
      source.close();
    };
    return () => {
      clearTimeout(timeoutId);
      source.close();
    };
  }, [normalized, refresh]);

  // Restore voter name and previous votes from localStorage
  useEffect(() => {
    if (!normalized || restoredRef.current) return;
    restoredRef.current = true;

    const persistedName = getVoterName();
    if (persistedName) {
      setName(persistedName);
    }

    const voted = getVotedRoom(normalized);
    if (voted) {
      setSubmitted(true);
      setExistingVoteIds(voted.voteIds);
      setSavedVotes(voted.votes);
      setSavedVoterName(voted.voterName);
      if (voted.voterName) {
        setName(voted.voterName);
      }
    }
  }, [normalized]);

  const roles = room?.roles?.length ? room.roles : ["General"];
  const candidates = room?.candidates ?? [];
  const allowWriteIns = room?.allowWriteIns ?? true;
  const hasCandidateOptions = candidates.length > 0;

  const prepopulateForm = useCallback(() => {
    savedVotes.forEach((vote) => {
      const isKnownCandidate = candidates.some(
        (c) => c.trim().toUpperCase() === vote.candidateName.trim().toUpperCase()
      );
      if (hasCandidateOptions && isKnownCandidate) {
        const matchedCandidate = candidates.find(
          (c) => c.trim().toUpperCase() === vote.candidateName.trim().toUpperCase()
        )!;
        setRoleOption((current) => ({ ...current, [vote.roleName]: matchedCandidate }));
        setRoleCandidates((current) => ({ ...current, [vote.roleName]: matchedCandidate }));
        setRoleWriteIns((current) => ({ ...current, [vote.roleName]: "" }));
      } else if (hasCandidateOptions) {
        setRoleOption((current) => ({ ...current, [vote.roleName]: "other" }));
        setRoleWriteIns((current) => ({ ...current, [vote.roleName]: vote.candidateName }));
        setRoleCandidates((current) => ({ ...current, [vote.roleName]: vote.candidateName }));
      } else {
        setRoleCandidates((current) => ({ ...current, [vote.roleName]: vote.candidateName }));
      }
    });
    setName(savedVoterName || getVoterName());
  }, [savedVotes, savedVoterName, candidates, hasCandidateOptions]);

  const handleEdit = () => {
    prepopulateForm();
    setSubmitted(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const voterName = name.trim();
    const votes = roles
      .map((role) => ({
        roleName: role,
        candidateName: (roleCandidates[role] ?? "").trim(),
      }))
      .filter((entry) => entry.candidateName);

    if (votes.length !== roles.length) return;

    const isUpdate = existingVoteIds.length > 0;
    const method = isUpdate ? "PUT" : "POST";
    const payload: Record<string, unknown> = { voterName, votes };
    if (isUpdate) {
      payload.voteIds = existingVoteIds;
    }

    let response = await fetch(`/api/rooms/${normalized}/votes`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // If PUT fails with 404 (stale IDs), fall back to fresh POST
    if (isUpdate && response.status === 404) {
      removeVotedRoom(normalized);
      response = await fetch(`/api/rooms/${normalized}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterName, votes }),
      });
    }

    if (!response.ok) return;

    const data = (await response.json()) as VoteResponse;

    // Persist to localStorage
    if (voterName) {
      persistVoterName(voterName);
    }
    const newVoteIds = data.votes.map((v) => v.id);
    const newVotes = data.votes.map((v) => ({
      roleName: v.roleName,
      candidateName: v.candidateName,
    }));
    addVotedRoom({
      code: normalized,
      voterName: data.voterName,
      voteIds: newVoteIds,
      votes: newVotes,
      lastVotedAt: new Date().toISOString(),
    });

    setExistingVoteIds(newVoteIds);
    setSavedVotes(newVotes);
    setSavedVoterName(data.voterName);
    setSubmitted(true);
  };

  const isClosed = Boolean(room?.closedAt);
  const canVote = !isClosed && !submitted;
  const canSubmit =
    canVote &&
    (hasCandidateOptions || allowWriteIns) &&
    roles.every((role) => Boolean((roleCandidates[role] ?? "").trim()));

  if (!normalized) return null;

  if (!room && !isLoading) {
    return (
      <Shell>
        <section className="panel flex flex-col gap-4 p-8 reveal">
          <p className="chip w-fit">Room not found</p>
          <h1 className="text-3xl font-[family:var(--font-display)] text-ink">
            That code doesn&apos;t exist.
          </h1>
          <p className="text-muted">
            Check the code and try again, or head back to join another room.
          </p>
          <Link
            href="/"
            className="w-fit rounded-2xl bg-ink px-4 py-3 text-sm uppercase tracking-[0.3em] text-on-ink"
          >
            Return home
          </Link>
        </section>
      </Shell>
    );
  }

  if (isLoading) {
    return (
      <Shell>
        <section className="panel flex flex-col gap-4 p-8 reveal">
          <p className="chip w-fit">Loading</p>
          <h1 className="text-3xl font-[family:var(--font-display)] text-ink">
            Joining room...
          </h1>
          <p className="text-muted">Fetching the latest room status.</p>
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <main className="flex flex-col items-center">
        <section className="panel flex w-full max-w-3xl flex-col gap-6 p-8 reveal">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-[family:var(--font-display)] text-ink">
              Room {normalized}
            </h1>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">
              Complete one vote for each role
            </p>
          </div>
          <p className="text-muted">
            Your vote is sent to the host only. Other voters never see results.
          </p>

          {submitted ? (
            <section className="surface-soft flex flex-col gap-4 rounded-3xl border border-border p-6 text-ink">
              <p className="text-sm uppercase tracking-[0.3em] text-muted">
                Vote submitted
              </p>
              <h2 className="text-2xl font-[family:var(--font-display)]">
                Votes submitted. You&apos;re all set.
              </h2>
              {savedVotes.length > 0 && (
                <div className="flex flex-col gap-2">
                  {savedVoterName && savedVoterName !== "Anonymous" && (
                    <p className="text-sm text-muted">
                      Voted as <span className="font-medium text-ink">{savedVoterName}</span>
                    </p>
                  )}
                  {savedVotes.map((vote) => (
                    <div
                      key={vote.roleName}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="text-muted">{vote.roleName}:</span>
                      <span className="font-medium">{vote.candidateName}</span>
                    </div>
                  ))}
                </div>
              )}
              {!isClosed && (
                <button
                  type="button"
                  onClick={handleEdit}
                  className="w-fit rounded-2xl border border-ink px-4 py-3 text-xs uppercase tracking-[0.3em] text-ink transition hover:-translate-y-0.5"
                >
                  Edit vote
                </button>
              )}
              {isClosed && (
                <p className="text-sm text-muted">
                  Voting is closed for this room.
                </p>
              )}
            </section>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-[0.3em] text-muted">
                  Your name (optional)
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Alex Johnson"
                  disabled={!canVote}
                  className="surface-soft rounded-2xl border border-border px-4 py-3 text-ink outline-none transition focus:border-ink disabled:opacity-60"
                />
              </div>

              {roles.map((role) => (
                <section
                  key={role}
                  className="surface-soft flex flex-col gap-3 rounded-2xl border border-border p-4"
                >
                  <h2 className="text-lg font-[family:var(--font-display)] text-ink">
                    {role}
                  </h2>
                  {hasCandidateOptions ? (
                    <>
                      <label className="text-xs uppercase tracking-[0.3em] text-muted">
                        Choose a candidate
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {candidates.map((candidateName) => (
                          <label
                            key={`${role}-${candidateName}`}
                            className="surface flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm text-ink"
                          >
                            <input
                              type="radio"
                              name={`candidate-${role}`}
                              value={candidateName}
                              checked={roleOption[role] === candidateName}
                              onChange={() => {
                                setRoleOption((current) => ({
                                  ...current,
                                  [role]: candidateName,
                                }));
                                setRoleCandidates((current) => ({
                                  ...current,
                                  [role]: candidateName,
                                }));
                                setRoleWriteIns((current) => ({
                                  ...current,
                                  [role]: "",
                                }));
                              }}
                              disabled={!canVote}
                            />
                            <span>{candidateName}</span>
                          </label>
                        ))}
                      </div>
                      {allowWriteIns ? (
                        <label className="surface flex flex-col gap-2 rounded-2xl border border-border px-4 py-3 text-sm text-ink">
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name={`candidate-${role}`}
                              value="other"
                              checked={roleOption[role] === "other"}
                              onChange={() => {
                                setRoleOption((current) => ({
                                  ...current,
                                  [role]: "other",
                                }));
                                setRoleCandidates((current) => ({
                                  ...current,
                                  [role]: roleWriteIns[role] ?? "",
                                }));
                              }}
                              disabled={!canVote}
                            />
                            <span>Write in another name</span>
                          </div>
                          {roleOption[role] === "other" ? (
                            <input
                              value={roleWriteIns[role] ?? ""}
                              onChange={(event) => {
                                const value = event.target.value;
                                setRoleWriteIns((current) => ({
                                  ...current,
                                  [role]: value,
                                }));
                                setRoleCandidates((current) => ({
                                  ...current,
                                  [role]: value,
                                }));
                              }}
                              placeholder={`Candidate name for ${role}`}
                              disabled={!canVote}
                              className="surface rounded-2xl border border-border px-3 py-2 text-sm text-ink outline-none"
                            />
                          ) : null}
                        </label>
                      ) : (
                        <p className="text-xs text-muted">
                          Write-in candidates are disabled for this room.
                        </p>
                      )}
                    </>
                  ) : allowWriteIns ? (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs uppercase tracking-[0.3em] text-muted">
                        Candidate name
                      </label>
                      <input
                        value={roleCandidates[role] ?? ""}
                        onChange={(event) =>
                          setRoleCandidates((current) => ({
                            ...current,
                            [role]: event.target.value,
                          }))
                        }
                        placeholder={
                          roles.length === 1
                            ? "Candidate name"
                            : `Candidate name for ${role}`
                        }
                        disabled={!canVote}
                        className="surface rounded-2xl border border-border px-4 py-3 text-ink outline-none transition focus:border-ink disabled:opacity-60"
                      />
                    </div>
                  ) : (
                    <div className="surface rounded-2xl border border-border px-4 py-3 text-sm text-muted">
                      No candidates are available, and write-ins are disabled.
                    </div>
                  )}
                </section>
              ))}

              <button
                type="submit"
                disabled={!canSubmit}
                className="cta-primary rounded-2xl px-4 py-3 text-sm uppercase tracking-[0.3em] transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-60"
              >
                {existingVoteIds.length > 0 ? "Update votes" : "Submit votes"}
              </button>
              {isClosed && (
                <p className="text-sm text-muted">
                  Voting is closed for this room.
                </p>
              )}
            </form>
          )}

          <Link
            href="/"
            className="w-fit rounded-2xl border border-ink px-4 py-3 text-xs uppercase tracking-[0.3em] text-ink"
          >
            Back to home
          </Link>
        </section>
      </main>
    </Shell>
  );
}
