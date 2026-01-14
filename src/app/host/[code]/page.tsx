"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import type { Room, TallyEntry } from "@/lib/types";

export default function HostRoom() {
  const params = useParams();
  const code = useMemo(
    () => (Array.isArray(params.code) ? params.code[0] : params.code),
    [params.code]
  );
  const normalized = (code ?? "").toUpperCase();
  const [room, setRoom] = useState<Room | undefined>();
  const [tally, setTally] = useState<TallyEntry[]>([]);
  const [winner, setWinner] = useState<TallyEntry | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);
  const [mergeTarget, setMergeTarget] = useState("");
  const [isMerging, setIsMerging] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch(`/api/rooms/${normalized}/summary`, {
      cache: "no-store",
    });
    if (!response.ok) {
      setRoom(undefined);
      setIsLoading(false);
      return;
    }
    const data = await response.json();
    setRoom(data.room);
    setTally(data.tally);
    setWinner(data.winner);
    setTotalVotes(data.totalVotes);
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

  const handleCopy = async () => {
    if (!normalized) return;
    await navigator.clipboard.writeText(normalized);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const handleEndVoting = async () => {
    await fetch(`/api/rooms/${normalized}/close`, { method: "POST" });
    refresh();
  };

  const toggleMergeSelection = (candidate: string) => {
    setMergeSelection((current) =>
      current.includes(candidate)
        ? current.filter((item) => item !== candidate)
        : [...current, candidate]
    );
    if (!mergeTarget) {
      setMergeTarget(candidate);
    }
  };

  const handleMerge = async () => {
    if (mergeSelection.length < 2 || !mergeTarget.trim()) return;
    setIsMerging(true);
    await fetch(`/api/rooms/${normalized}/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceCandidates: mergeSelection,
        targetCandidate: mergeTarget.trim(),
      }),
    });
    setIsMerging(false);
    setMergeSelection([]);
    setMergeTarget("");
    refresh();
  };

  if (!normalized) return null;

  if (!room && !isLoading) {
    return (
      <Shell>
        <section className="panel flex flex-col gap-4 p-8 reveal">
          <p className="chip w-fit">Room not found</p>
          <h1 className="text-3xl font-[family:var(--font-display)] text-ink">
            We cannot locate that code.
          </h1>
          <p className="text-muted">
            Double-check the room code or create a new one.
          </p>
          <Link
            href="/host"
            className="w-fit rounded-2xl bg-ink px-4 py-3 text-sm uppercase tracking-[0.3em] text-on-ink"
          >
            Return to host
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
            Fetching room data...
          </h1>
          <p className="text-muted">Hang tight while we sync the tally.</p>
        </section>
      </Shell>
    );
  }

  if (!room) return null;

  const isClosed = Boolean(room.closedAt);

  return (
    <Shell>
      <main className="flex flex-col gap-8">
        <section className="panel grid gap-6 p-8 lg:grid-cols-[1.1fr_0.9fr] reveal">
          <div className="flex flex-col gap-4">
            <p className="chip w-fit">Host dashboard</p>
            <h1 className="text-3xl font-[family:var(--font-display)] text-ink sm:text-4xl">
              Room {normalized}
            </h1>
            <p className="text-muted">
              Share the code and watch the tally update in real time. End the
              vote when you are ready to lock submissions.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-2xl border border-ink px-4 py-2 text-xs uppercase tracking-[0.3em] text-ink"
              >
                {copied ? "Copied" : "Copy code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/room/${normalized}`;
                }}
                className="rounded-2xl bg-ink px-4 py-2 text-xs uppercase tracking-[0.3em] text-white"
              >
                Open voter view
              </button>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-2xl border border-border bg-white/80 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">
                Status
              </p>
              <p className="mt-2 text-lg text-ink">
                {isClosed ? "Voting closed" : "Live voting"}
              </p>
              <p className="text-sm text-muted">Total votes: {totalVotes}</p>
            </div>
            {room.candidates?.length ? (
              <div className="rounded-2xl border border-border bg-white/80 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">
                  Candidates
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                  {room.candidates.map((candidate) => (
                    <span
                      key={candidate}
                      className="rounded-full border border-border bg-white px-3 py-1"
                    >
                      {candidate}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="rounded-2xl border border-border bg-white/80 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">
                Current leader
              </p>
              <p className="mt-2 text-lg text-ink">
                {winner ? winner.candidate : "Waiting for first vote..."}
              </p>
              <p className="text-sm text-muted">
                {winner
                  ? `${winner.count} votes`
                  : "Waiting for first vote..."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowEndModal(true)}
              disabled={isClosed}
              className="rounded-2xl bg-mint px-4 py-3 text-xs uppercase tracking-[0.3em] text-paper transition disabled:opacity-50"
            >
              {isClosed ? "Room closed" : "End voting"}
            </button>
          </div>
        </section>

        <section className="panel flex flex-col gap-6 p-8 reveal reveal-delay-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Live tally</p>
              <h2 className="text-2xl font-[family:var(--font-display)] text-ink">
                Votes by candidate
              </h2>
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">
              {totalVotes} total
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">
              Merge candidates
            </p>
            <p className="mt-2 text-sm text-muted">
              Select two or more candidates, then choose the final name.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                value={mergeTarget}
                onChange={(event) => setMergeTarget(event.target.value)}
                placeholder="Merged name"
                className="min-w-[220px] flex-1 rounded-2xl border border-border bg-white px-4 py-2 text-sm text-ink outline-none"
              />
              <button
                type="button"
                onClick={handleMerge}
                disabled={mergeSelection.length < 2 || !mergeTarget.trim() || isMerging}
                className="rounded-2xl bg-ink px-4 py-2 text-xs uppercase tracking-[0.3em] text-white transition disabled:opacity-50"
              >
                {isMerging ? "Merging..." : "Merge selected"}
              </button>
              {mergeSelection.length ? (
                <button
                  type="button"
                  onClick={() => {
                    setMergeSelection([]);
                    setMergeTarget("");
                  }}
                  className="rounded-2xl border border-ink px-4 py-2 text-xs uppercase tracking-[0.3em] text-ink"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          {tally.length === 0 ? (
            <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border bg-white/60 p-6 text-muted">
              <svg
                aria-hidden="true"
                className="h-10 w-10 text-muted"
                viewBox="0 0 48 48"
                fill="none"
              >
                <circle
                  cx="24"
                  cy="24"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M24 6v6M24 36v6M6 24h6M36 24h6M11 11l4 4M33 33l4 4M37 11l-4 4M15 33l-4 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <p>No votes yet. Share the room code to start voting.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {tally.map((entry) => (
                <div
                  key={entry.candidate}
                  className="rounded-2xl border border-border bg-white/80 p-5"
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={mergeSelection.includes(entry.candidate)}
                        onChange={() => toggleMergeSelection(entry.candidate)}
                      />
                      <span className="text-lg text-ink">
                        {entry.candidate}
                      </span>
                    </label>
                    <p className="text-sm text-muted">{entry.count} votes</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                    {entry.voters.map((voter) => (
                      <span
                        key={`${entry.candidate}-${voter}`}
                        className="rounded-full border border-border bg-white px-3 py-1"
                      >
                        {voter}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      {showEndModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6">
          <div className="panel w-full max-w-md p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">
              Confirmation
            </p>
            <h2 className="mt-2 text-2xl font-[family:var(--font-display)] text-ink">
              End voting?
            </h2>
            <p className="mt-3 text-sm text-muted">
              Votes will be locked and no new votes will be accepted.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={async () => {
                  setShowEndModal(false);
                  await handleEndVoting();
                }}
                className="rounded-2xl bg-ink px-4 py-2 text-xs uppercase tracking-[0.3em] text-on-ink transition hover:-translate-y-0.5 hover:bg-black"
              >
                End voting
              </button>
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                className="rounded-2xl border border-ink px-4 py-2 text-xs uppercase tracking-[0.3em] text-ink"
              >
                Keep voting
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
