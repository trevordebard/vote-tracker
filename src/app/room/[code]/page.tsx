"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Shell from "@/components/Shell";
import type { Room } from "@/lib/types";

export default function VoterRoom() {
  const params = useParams();
  const code = useMemo(
    () => (Array.isArray(params.code) ? params.code[0] : params.code),
    [params.code]
  );
  const normalized = (code ?? "").toUpperCase();
  const [room, setRoom] = useState<Room | undefined>();
  const [name, setName] = useState("");
  const [candidate, setCandidate] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [writeIn, setWriteIn] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    const data = await response.json();
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const voterName = name.trim();
    const candidateName = candidate.trim();
    if (!voterName || !candidateName) return;
    const response = await fetch(`/api/rooms/${normalized}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterName, candidateName }),
    });
    if (!response.ok) return;
    setSubmitted(true);
    setName("");
    setCandidate("");
    setSelectedCandidate("");
    setWriteIn("");
  };

  const isClosed = Boolean(room?.closedAt);
  const canVote = !isClosed && !submitted;
  const candidates = room?.candidates ?? [];
  const allowWriteIns = room?.allowWriteIns ?? true;
  const canSubmit = canVote && (allowWriteIns || candidates.length > 0);

  if (!normalized) return null;

  if (!room && !isLoading) {
    return (
      <Shell>
        <section className="panel flex flex-col gap-4 p-8 reveal">
          <p className="chip w-fit">Room not found</p>
          <h1 className="text-3xl font-[family:var(--font-display)] text-ink">
            That voting room does not exist.
          </h1>
          <p className="text-muted">
            Ask the host for a valid code, or head back to join another room.
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
        <section className="panel w-full max-w-3xl flex flex-col gap-6 p-8 reveal">
          <p className="chip w-fit">Voting room</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-[family:var(--font-display)] text-ink">
              Room {normalized}
            </h1>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">
              Step 1 · Name · Step 2 · Candidate · Step 3 · Submit
            </p>
          </div>
          <p className="text-muted">
            Your vote is sent to the host only. Other voters never see results.
          </p>

          {submitted && !isClosed ? (
            <section className="flex flex-col gap-4 rounded-3xl border border-border bg-white/80 p-6 text-ink">
              <p className="text-sm uppercase tracking-[0.3em] text-muted">
                Submission recorded
              </p>
              <h2 className="text-2xl font-[family:var(--font-display)]">
                Thanks for voting!
              </h2>
              <p className="text-sm text-muted">
                Your submission has been recorded. You can watch the votes come
                in on the live tally board.
              </p>
              <Link
                href={`/host/${normalized}`}
                className="w-fit rounded-2xl bg-ink px-4 py-3 text-xs uppercase tracking-[0.3em] transition hover:-translate-y-0.5 hover:bg-black"
                style={{ color: "var(--on-ink)" }}
              >
                Watch live tally
              </Link>
            </section>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-[0.3em] text-muted">
                  Your name
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Alex Johnson"
                  disabled={!canVote}
                  className="rounded-2xl border border-border bg-white/80 px-4 py-3 text-ink outline-none transition focus:border-ink disabled:opacity-60"
                />
              </div>

              {candidates.length ? (
                <div className="flex flex-col gap-3">
                  <label className="text-xs uppercase tracking-[0.3em] text-muted">
                    Choose a candidate
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {candidates.map((candidateName) => (
                      <label
                        key={candidateName}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-white/80 px-4 py-3 text-sm text-ink"
                      >
                        <input
                          type="radio"
                          name="candidate"
                          value={candidateName}
                          checked={selectedCandidate === candidateName}
                          onChange={() => {
                            setSelectedCandidate(candidateName);
                            setCandidate(candidateName);
                            setWriteIn("");
                          }}
                          disabled={!canVote}
                        />
                        <span>{candidateName}</span>
                      </label>
                    ))}
                  </div>
                  {allowWriteIns ? (
                    <label className="flex flex-col gap-2 rounded-2xl border border-border bg-white/80 px-4 py-3 text-sm text-ink">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="candidate"
                          value="other"
                          checked={selectedCandidate === "other"}
                          onChange={() => {
                            setSelectedCandidate("other");
                            setCandidate(writeIn);
                          }}
                          disabled={!canVote}
                        />
                        <span>Write in another name</span>
                      </div>
                      {selectedCandidate === "other" ? (
                        <input
                          value={writeIn}
                          onChange={(event) => {
                            setWriteIn(event.target.value);
                            setCandidate(event.target.value);
                          }}
                          placeholder="Type a name"
                          disabled={!canVote}
                          className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-ink outline-none"
                        />
                      ) : null}
                    </label>
                  ) : (
                    <p className="text-xs text-muted">
                      Write-in candidates are disabled for this room.
                    </p>
                  )}
                </div>
              ) : allowWriteIns ? (
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-muted">
                    Candidate name
                  </label>
                  <input
                    value={candidate}
                    onChange={(event) => setCandidate(event.target.value)}
                    placeholder="Candidate name"
                    disabled={!canVote}
                    className="rounded-2xl border border-border bg-white/80 px-4 py-3 text-ink outline-none transition focus:border-ink disabled:opacity-60"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-white/80 px-4 py-3 text-sm text-muted">
                  No candidates are available, and write-ins are disabled.
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-2xl bg-ink px-4 py-3 text-sm uppercase tracking-[0.3em] text-on-ink transition hover:-translate-y-0.5 hover:bg-black disabled:opacity-60"
              >
                Submit vote
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
