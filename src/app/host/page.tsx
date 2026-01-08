"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Shell from "@/components/Shell";

export default function HostLanding() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [candidatesText, setCandidatesText] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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

  const handleOpen = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    router.push(`/host/${normalized}`);
  };

  return (
    <Shell>
      <main className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="panel flex flex-col gap-5 p-8 reveal">
          <p className="chip w-fit">Host Mode</p>
          <h1 className="text-3xl font-[family:var(--font-display)] text-ink sm:text-4xl">
            Command the room.
          </h1>
          <p className="text-muted">
            Generate a code and open a live tally board. You will see every vote
            and a winner summary as the room fills.
          </p>
          <div className="flex flex-col gap-2 text-xs text-muted">
            <label className="uppercase tracking-[0.3em]">
              Optional candidates
            </label>
            <textarea
              value={candidatesText}
              onChange={(event) => setCandidatesText(event.target.value)}
              placeholder="Alex Kim, Jordan Lee, Sam Patel"
              rows={4}
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
            {isCreating ? "Creating..." : "Create a new room"}
          </button>
        </section>

        <section className="panel flex flex-col gap-6 p-8 reveal reveal-delay-1">
          <div>
            <p className="text-sm text-muted">Already have a code?</p>
            <h2 className="text-2xl font-[family:var(--font-display)] text-ink">
              Open an existing room
            </h2>
          </div>
          <form onSubmit={handleOpen} className="flex flex-col gap-4">
            <label className="text-xs uppercase tracking-[0.3em] text-muted">
              Room code
            </label>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="ABC123"
              className="rounded-2xl border border-border bg-white/80 px-4 py-3 text-lg uppercase tracking-[0.2em] text-ink outline-none transition focus:border-ink"
            />
            <button
              type="submit"
              className="rounded-2xl bg-ink px-4 py-3 text-sm uppercase tracking-[0.3em] text-on-ink transition hover:-translate-y-0.5 hover:bg-black"
            >
              Open dashboard
            </button>
          </form>
        </section>
      </main>
    </Shell>
  );
}
