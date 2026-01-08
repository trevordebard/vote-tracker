"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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

  const refresh = async () => {
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
  };

  useEffect(() => {
    if (!normalized) return;
    refresh();
    const source = new EventSource(`/api/rooms/${normalized}/stream`);
    source.onmessage = () => {
      refresh();
    };
    source.onerror = () => {
      source.close();
    };
    return () => {
      source.close();
    };
  }, [normalized]);

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
  const candidates = room?.candidates ?? [];

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
      <main className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel flex flex-col gap-6 p-8 reveal">
          <p className="chip w-fit">Voting room</p>
          <h1 className="text-3xl font-[family:var(--font-display)] text-ink">
            Room {normalized}
          </h1>
          <p className="text-muted">
            Enter your name and the candidate you want to vote for. Votes are
            anonymous to other voters but visible to the host.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.3em] text-muted">
                Your name
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Alex Johnson"
                disabled={isClosed}
                className="rounded-2xl border border-border bg-white/80 px-4 py-3 text-ink outline-none transition focus:border-ink disabled:opacity-60"
              />
            </div>
            {candidates.length ? (
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-[0.3em] text-muted">
                  Selected candidate
                </label>
                <div className="rounded-2xl border border-border bg-white/80 px-4 py-3 text-sm text-ink">
                  {candidate.trim() || "Select a name from the list"}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-[0.3em] text-muted">
                  Candidate
                </label>
                <input
                  value={candidate}
                  onChange={(event) => setCandidate(event.target.value)}
                  placeholder="Candidate name"
                  disabled={isClosed}
                  className="rounded-2xl border border-border bg-white/80 px-4 py-3 text-ink outline-none transition focus:border-ink disabled:opacity-60"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={isClosed}
              className="rounded-2xl bg-ink px-4 py-3 text-sm uppercase tracking-[0.3em] text-on-ink transition hover:-translate-y-0.5 hover:bg-black disabled:opacity-60"
            >
              Submit vote
            </button>
            {submitted && !isClosed && (
              <p className="text-sm text-mint">Vote received. Thank you.</p>
            )}
            {isClosed && (
              <p className="text-sm text-muted">
                Voting is closed for this room.
              </p>
            )}
          </form>
        </section>

        <aside className="panel flex flex-col gap-6 p-8 reveal reveal-delay-1">
          <div>
            <p className="text-sm text-muted">Candidate list</p>
            <h2 className="text-2xl font-[family:var(--font-display)] text-ink">
              Choose or write in
            </h2>
            <p className="text-sm text-muted">
              Hosts can pre-fill candidates, but you can always write in
              someone new.
            </p>
          </div>
          {candidates.length ? (
            <div className="flex flex-col gap-3 text-sm text-ink">
              {candidates.map((candidateName) => (
                <label
                  key={candidateName}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-white/80 px-4 py-3"
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
                    disabled={isClosed}
                  />
                  <span>{candidateName}</span>
                </label>
              ))}
              <label className="flex flex-col gap-2 rounded-2xl border border-border bg-white/80 px-4 py-3">
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
                    disabled={isClosed}
                  />
                  <span>Write-in candidate</span>
                </div>
                {selectedCandidate === "other" ? (
                  <input
                    value={writeIn}
                    onChange={(event) => {
                      setWriteIn(event.target.value);
                      setCandidate(event.target.value);
                    }}
                    placeholder="Type a name"
                    disabled={isClosed}
                    className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-ink outline-none"
                  />
                ) : null}
              </label>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted">
              No preset candidates. Use the form to enter any name.
            </div>
          )}
          <Link
            href="/"
            className="rounded-2xl border border-ink px-4 py-3 text-xs uppercase tracking-[0.3em] text-ink"
          >
            Back to home
          </Link>
        </aside>
      </main>
    </Shell>
  );
}
