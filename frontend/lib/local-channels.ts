"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "nixo-extra-channels";

export type ExtraChannel = {
  id: string;
  createdAt: string;
};

const read = (): ExtraChannel[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ExtraChannel[]) : [];
  } catch {
    return [];
  }
};

const write = (next: ExtraChannel[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
};

export const slugifyChannel = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function useExtraChannels() {
  const [extras, setExtras] = useState<ExtraChannel[]>([]);

  useEffect(() => {
    setExtras(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setExtras(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((rawId: string) => {
    const id = slugifyChannel(rawId);
    if (!id) return null;
    setExtras((prev) => {
      if (prev.some((e) => e.id === id)) return prev;
      const next = [...prev, { id, createdAt: new Date().toISOString() }];
      write(next);
      return next;
    });
    return id;
  }, []);

  return { extras, add };
}
