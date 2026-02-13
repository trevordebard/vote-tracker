"use client";

import { useRef, useState, type KeyboardEvent } from "react";

type ChipInputProps = {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

export default function ChipInput({
  values,
  onChange,
  placeholder,
}: ChipInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const items = raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 0) return;
    const next = [...values];
    for (const item of items) {
      if (!next.includes(item)) next.push(item);
    }
    onChange(next);
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
    }
    if (event.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const remove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="surface-soft flex min-h-[46px] cursor-text flex-wrap items-center gap-2 rounded-2xl border border-border px-3 py-2 transition focus-within:border-ink"
    >
      {values.map((value, index) => (
        <span
          key={value}
          className="flex items-center gap-1 rounded-full border border-border bg-[var(--chip-bg)] px-3 py-1 text-xs text-ink"
        >
          {value}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              remove(index);
            }}
            className="ml-0.5 text-muted hover:text-ink"
            aria-label={`Remove ${value}`}
          >
            &times;
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => {
          const val = e.target.value;
          if (val.includes(",")) {
            commit(val);
          } else {
            setDraft(val);
          }
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
        placeholder={values.length === 0 ? placeholder : ""}
        className="min-w-[120px] flex-1 bg-transparent py-1 text-sm text-ink outline-none placeholder:text-muted"
      />
    </div>
  );
}
