"use client";

const STORAGE_KEY = "vote-tracker:voter-name";

const isBrowser = () => typeof window !== "undefined";

export const getVoterName = (): string => {
  if (!isBrowser()) return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
};

export const setVoterName = (name: string): void => {
  if (!isBrowser()) return;
  const trimmed = name.trim();
  if (trimmed) {
    window.localStorage.setItem(STORAGE_KEY, trimmed);
  }
};
