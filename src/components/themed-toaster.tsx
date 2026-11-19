"use client";

import { useSyncExternalStore } from "react";
import { Toaster } from "sonner";
import { useThemePref } from "@/lib/theme";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

export function ThemedToaster() {
  useThemePref();
  const mode = useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light" as const,
  );
  return <Toaster position="top-center" theme={mode} closeButton toastOptions={{ duration: 3500 }} />;
}
