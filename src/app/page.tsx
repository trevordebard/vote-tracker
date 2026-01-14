"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Shell from "@/components/Shell";

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");

  const handleJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = roomCode.trim().toUpperCase();
    if (!normalized) return;
    router.push(`/room/${normalized}`);
  };

  return (
    <Shell>
      <main className="flex flex-col gap-8">
        <section className="panel flex flex-col gap-4 p-10 reveal">
          <p className="chip w-fit">Vote Tracker</p>
          <h1 className="text-balance text-4xl font-[family:var(--font-display)] text-ink sm:text-5xl">
            Vote together in seconds.
          </h1>
          <p className="max-w-2xl text-base text-muted sm:text-lg">
            Join with a code or create a room.
          </p>
        </section>

        <section className="grid items-start gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <section
            id="join"
            className="panel panel-primary flex flex-col gap-6 p-8 reveal"
          >
            <div>
              <p className="text-sm text-muted">Join a room</p>
              <h2 className="text-3xl font-[family:var(--font-display)] text-ink">
                Enter a code to vote.
              </h2>
            </div>
            <form
              onSubmit={handleJoin}
              className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end"
            >
              <div className="flex flex-col gap-3">
                <label className="text-xs uppercase tracking-[0.3em] text-muted">
                  Room code
                </label>
                <input
                  value={roomCode}
                  onChange={(event) => {
                    const sanitized = event.target.value
                      .replace(/\s+/g, "")
                      .toUpperCase();
                    setRoomCode(sanitized);
                  }}
                  placeholder="ABC123"
                  autoFocus
                  className="surface-soft rounded-2xl border border-border px-4 py-3 text-lg uppercase tracking-[0.2em] text-ink outline-none ring-0 transition focus:border-ink"
                />
              </div>
              <button
                type="submit"
                className="cta-primary h-[52px] rounded-2xl px-5 text-xs uppercase tracking-[0.24em] transition hover:-translate-y-0.5 hover:opacity-90 sm:text-sm"
              >
                Join room
              </button>
              <p className="text-xs text-muted lg:col-span-2">
                6 characters. Case-insensitive.
              </p>
            </form>
          </section>

          <section className="panel flex flex-col gap-4 p-8 text-left reveal reveal-delay-1">
            <p className="text-sm text-muted">Host a room</p>
            <h2 className="text-2xl font-[family:var(--font-display)] text-ink">
              Need to create a new room?
            </h2>
            <p className="text-sm text-muted">
              Start a vote, add optional candidates, and get a shareable code.
            </p>
            <Link
              href="/host"
              className="inline-flex w-fit items-center rounded-2xl border border-ink px-4 py-3 text-xs uppercase tracking-[0.3em] text-ink transition hover:-translate-y-0.5"
            >
              Create Room
            </Link>
          </section>
        </section>
      </main>
    </Shell>
  );
}
