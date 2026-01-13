"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Shell from "@/components/Shell";

export default function HostLanding() {
  const router = useRouter();
  const [candidatesText, setCandidatesText] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [allowWriteIns, setAllowWriteIns] = useState(true);

  const candidates = candidatesText
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const canCreate = allowWriteIns || candidates.length > 0;

  const handleCreate = async () => {
    if (isCreating) return;
    if (!canCreate) return;
    setIsCreating(true);
    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidates, allowWriteIns }),
    });
    setIsCreating(false);
    if (!response.ok) return;
    const room = await response.json();
    router.push(`/host/${room.code}`);
  };

  return (
    <Shell>
      <main className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel flex flex-col gap-6 p-8 reveal">
          <div className="flex flex-col gap-4">
            <p className="chip w-fit">Host Mode</p>
            <h1 className="text-3xl font-[family:var(--font-display)] text-ink sm:text-4xl">
              Create a room, then share the code.
            </h1>
            <p className="text-muted">
              You will get a shareable code and a live tally board. Guests join
              with the code and votes update instantly.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-xs text-muted">
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
          <label className="flex items-center gap-3 rounded-2xl border border-border bg-white/80 px-4 py-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={allowWriteIns}
              onChange={(event) => setAllowWriteIns(event.target.checked)}
            />
            Allow write-in candidates
          </label>
          {!allowWriteIns && candidates.length === 0 ? (
            <p className="text-xs text-muted">
              Add at least one candidate when write-ins are disabled.
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating || !canCreate}
            className="rounded-2xl bg-sun px-4 py-3 text-sm uppercase tracking-[0.3em] text-ink transition hover:-translate-y-0.5 hover:bg-[#ff8b37] disabled:opacity-60"
          >
            {isCreating ? "Creating..." : "Create room"}
          </button>
        </section>

        <section className="panel flex flex-col gap-5 p-8 text-sm text-muted reveal reveal-delay-1">
          <div>
            <p className="text-sm text-muted">How it works</p>
            <h2 className="text-2xl font-[family:var(--font-display)] text-ink">
              Two steps to start voting.
            </h2>
          </div>
          <div className="grid gap-4">
            <div className="rounded-2xl border border-border bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">
                Step 1
              </p>
              <p className="mt-2 text-ink">
                Create a room and copy the code.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">
                Step 2
              </p>
              <p className="mt-2 text-ink">
                Share it with the group to start the vote.
              </p>
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">
            Tip
          </p>
          <p className="text-ink">
            Write-ins are on by default. Turn them off to limit votes to your
            list.
          </p>
        </section>
      </main>
    </Shell>
  );
}
