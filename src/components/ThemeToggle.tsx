"use client";

import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "vote-tracker-theme";
const THEMES = ["light", "dark", "blue"] as const;

type Theme = (typeof THEMES)[number];

const getNextTheme = (current: Theme) => {
  const index = THEMES.indexOf(current);
  return THEMES[(index + 1) % THEMES.length];
};

const persistTheme = (value: Theme) => {
  try {
    if (typeof window === "undefined" || !("localStorage" in window)) return;
    window.localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch {
    // Ignore storage failures (e.g., private mode).
  }
};

const getInitialTheme = (): Theme => {
  if (typeof document === "undefined") return "light";

  const existing = document.documentElement.dataset.theme as Theme | undefined;
  if (existing && THEMES.includes(existing)) return existing;

  let stored: Theme | null = null;
  try {
    if (typeof window !== "undefined" && "localStorage" in window) {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    }
  } catch {
    stored = null;
  }
  if (stored && THEMES.includes(stored)) return stored;

  const prefersDark =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return prefersDark ? "dark" : "light";
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const handleToggle = () => {
    const nextTheme = getNextTheme(theme);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = nextTheme;
    }
    persistTheme(nextTheme);
    setTheme(nextTheme);
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = theme;
    persistTheme(theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="surface-soft rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.3em] text-ink transition hover:-translate-y-0.5"
      aria-label={`Switch theme (current: ${theme})`}
    >
      Theme: {theme}
    </button>
  );
}
