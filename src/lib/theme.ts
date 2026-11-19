"use client";

import { useSyncExternalStore } from "react";

export type ThemePref = "system" | "light" | "dark";

const KEY = "pt.theme";
const THEME_COLOR = { light: "#f4f2ee", dark: "#0e0f12" } as const;

/** Runs in <head> before paint so the page never flashes the wrong theme. */
export const themeInitScript = `(function(){try{var p=localStorage.getItem('${KEY}')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;

const listeners = new Set<() => void>();

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const mode = dark ? "dark" : "light";
  document.documentElement.dataset.theme = mode;
  // Status bar follows the in-app choice, not only the OS setting.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", THEME_COLOR[mode]));
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // ignore: preference just won't persist
  }
  applyTheme(pref);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (readPref() === "system") applyTheme("system");
    listener();
  };
  mq.addEventListener("change", onChange);
  return () => {
    listeners.delete(listener);
    mq.removeEventListener("change", onChange);
  };
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, readPref, () => "system");
}
