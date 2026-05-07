"use client";

import { useSyncExternalStore } from "react";
import { Star } from "lucide-react";

interface StarToggleProps {
  applicationId: string;
}

const STORAGE_KEY = "riffoff:starred-applications";

// Cached snapshot — useSyncExternalStore requires getSnapshot() to return
// the SAME reference when the underlying state hasn't changed. JSON.parse
// returns a new array each call, which would loop React forever.
let cachedRaw: string | null = null;
let cachedIds: readonly string[] = [];

function readSnapshot(): readonly string[] {
  try {
    const raw = (typeof window !== "undefined")
      ? localStorage.getItem(STORAGE_KEY)
      : null;
    if (raw === cachedRaw) return cachedIds;
    cachedRaw = raw;
    cachedIds = raw ? (JSON.parse(raw) as string[]) : [];
    return cachedIds;
  } catch {
    cachedRaw = null;
    cachedIds = [];
    return cachedIds;
  }
}

function subscribe(callback: () => void): () => void {
  function notify() {
    cachedRaw = null; // invalidate so the next read pulls fresh
    callback();
  }
  window.addEventListener("storage", notify);
  window.addEventListener("riffoff:starred-changed", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("riffoff:starred-changed", notify);
  };
}

const SERVER_SNAPSHOT: readonly string[] = [];

/**
 * Per-organiser favourite toggle. Persisted in localStorage so each
 * reviewer can flag standouts without polluting the shared application
 * document. Survives reloads within the same browser.
 */
export function StarToggle({ applicationId }: StarToggleProps) {
  const ids = useSyncExternalStore(
    subscribe,
    readSnapshot,
    () => SERVER_SNAPSHOT,
  );
  const starred = ids.includes(applicationId);

  function toggle() {
    try {
      const current = ids.slice();
      const next = current.includes(applicationId)
        ? current.filter((id) => id !== applicationId)
        : [...current, applicationId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      cachedRaw = null; // force re-read on next snapshot
      window.dispatchEvent(new Event("riffoff:starred-changed"));
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={starred}
      aria-label={starred ? "Remove star" : "Star this application"}
      suppressHydrationWarning
      className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
        starred
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
          : "border-border/60 text-muted-foreground hover:border-amber-500/40 hover:bg-amber-500/5 hover:text-amber-700 dark:hover:text-amber-300"
      }`}
    >
      <Star
        className={`size-3.5 transition-all ${starred ? "fill-amber-500 dark:fill-amber-300" : "group-hover:fill-amber-500/30"}`}
        aria-hidden="true"
      />
      {starred ? "Starred" : "Star"}
    </button>
  );
}
