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
      <main className="flex flex-col items-center">
        <section className="panel flex w-full max-w-3xl flex-col gap-6 p-8 reveal">
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
          <label className="surface-soft flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={allowWriteIns}
              onChange={(event) => setAllowWriteIns(event.target.checked)}
            />
            Allow write-in candidates
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
          ) : null}
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating || !canCreate}
            className="cta-primary rounded-2xl px-4 py-3 text-sm uppercase tracking-[0.3em] transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-60"
          >
            {isCreating ? "Creating..." : "Create room"}
          </button>
          <p className="text-xs text-muted">
            You&apos;ll get a shareable code and live results.
          </p>
        </section>
      </main>
    </Shell>
  );
}
