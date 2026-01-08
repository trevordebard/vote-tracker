"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Shell from "@/components/Shell";

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [candidatesText, setCandidatesText] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = roomCode.trim().toUpperCase();
    if (!normalized) return;
    router.push(`/room/${normalized}`);
  };

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    const candidates = candidatesText
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidates }),
    });
    setIsCreating(false);
    if (!response.ok) return;
    const room = await response.json();
    router.push(`/host/${room.code}`);
  };

  return (
    <Shell>
      <main className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-6 reveal">
            <p className="chip w-fit">Simple, fast, internal</p>
            <h1 className="text-balance text-4xl font-[family:var(--font-display)] text-ink sm:text-5xl lg:text-6xl">
              Run a voting room in minutes. See the tally the moment votes land.
            </h1>
            <p className="max-w-xl text-base text-muted sm:text-lg">
              Share a code, collect voter names, and track the leaderboard live.
              Built for quick decisions and lightweight internal polls.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 reveal reveal-delay-1">
            {[
              {
                title: "Live Tally",
                copy: "Watch votes stack up instantly as names arrive.",
              },
              {
                title: "Room Codes",
                copy: "One short code connects everyone to a single ballot.",
              },
              {
                title: "Voter Trace",
                copy: "See who voted for each candidate on the host view.",
              },
              {
                title: "Instant Summary",
                copy: "End the room with a clear winner and voter list.",
              },
            ].map((item) => (
              <div key={item.title} className="panel p-5">
                <p className="text-sm text-muted">{item.title}</p>
                <p className="mt-2 text-base text-ink">{item.copy}</p>
              </div>
            ))}
          </div>
          <div className="panel flex flex-col gap-4 p-6 text-sm text-muted reveal reveal-delay-2">
            <p className="uppercase tracking-[0.2em] text-ink">How it works</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-ink">1. Create a room</p>
                <p>Host generates a code and shares it.</p>
              </div>
              <div>
                <p className="text-ink">2. Collect votes</p>
                <p>Voters enter their name and candidate.</p>
              </div>
              <div>
                <p className="text-ink">3. Review summary</p>
                <p>Host sees the winner and voter list.</p>
              </div>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-6">
          <form
            onSubmit={handleJoin}
            className="panel flex flex-col gap-5 p-8 reveal reveal-delay-1"
          >
            <div>
              <p className="text-sm text-muted">Join a room</p>
              <h2 className="text-2xl font-[family:var(--font-display)] text-ink">
                Enter the code
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-xs uppercase tracking-[0.3em] text-muted">
                Room code
              </label>
              <input
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value)}
                placeholder="ABC123"
                className="rounded-2xl border border-border bg-white/80 px-4 py-3 text-lg uppercase tracking-[0.2em] text-ink outline-none ring-0 transition focus:border-ink"
              />
            </div>
            <button
              type="submit"
              className="rounded-2xl bg-ink px-4 py-3 text-sm uppercase tracking-[0.3em] text-on-ink transition hover:-translate-y-0.5 hover:bg-black"
            >
              Join room
            </button>
          </form>

          <div className="panel flex flex-col gap-4 p-8 reveal reveal-delay-2">
            <p className="text-sm text-muted">Host a new room</p>
            <h3 className="text-xl font-[family:var(--font-display)] text-ink">
              Generate a code and start collecting votes.
            </h3>
            <div className="flex flex-col gap-2 text-xs text-muted">
              <label className="uppercase tracking-[0.3em]">
                Optional candidates
              </label>
              <textarea
                value={candidatesText}
                onChange={(event) => setCandidatesText(event.target.value)}
                placeholder="Alex Kim, Jordan Lee, Sam Patel"
                rows={3}
                className="rounded-2xl border border-border bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-ink"
              />
              <p>Separate names with commas or new lines.</p>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating}
              className="rounded-2xl bg-sun px-4 py-3 text-sm uppercase tracking-[0.3em] text-ink transition hover:-translate-y-0.5 hover:bg-[#ff8b37] disabled:opacity-60"
            >
              {isCreating ? "Creating..." : "Create room"}
            </button>
            <p className="text-xs text-muted">
              Already have a room? Visit the{' '}
              <Link className="text-ink underline" href="/host">
                host dashboard
              </Link>
              .
            </p>
          </div>
        </aside>
      </main>
    </Shell>
  );
}
