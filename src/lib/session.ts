"use client";

import { useSyncExternalStore } from "react";
import { mutate } from "swr";
import type { Session } from "./types";

const KEY = "pt.session";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: Session | null = null;

function read(): Session | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      cached = null;
    }
  }
  return cached;
}

function emit() {
  listeners.forEach((l) => l());
}

export function getSession(): Session | null {
  return typeof window === "undefined" ? null : read();
}

export function setSession(session: Session | null) {
  // A different (or no) account: drop every cached response.
  if (session?.user.id !== getSession()?.user.id) void mutate(() => true, undefined, { revalidate: false });
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked (private mode); session lives only in memory for this tab.
    cachedRaw = undefined;
    cached = session;
  }
  emit();
}

export function updateSession(patch: Partial<Session>) {
  const current = getSession();
  if (current) setSession({ ...current, ...patch });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * `undefined` while rendering on the server (session unknown), then the
 * stored session or `null` in the browser.
 */
export function useSession(): Session | null | undefined {
  return useSyncExternalStore<Session | null | undefined>(subscribe, read, () => undefined);
}
