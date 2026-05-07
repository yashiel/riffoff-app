"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Lock, Save, Check } from "lucide-react";

interface InternalNotesProps {
  applicationId: string;
}

const STORAGE_PREFIX = "riffoff:internal-notes:";
const SAVE_DEBOUNCE_MS = 600;

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener("riffoff:internal-notes-changed", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("riffoff:internal-notes-changed", callback);
  };
}

/**
 * Organiser-only scratch pad for an application — autosaving textarea
 * keyed by application ID. Stored locally so private comments are
 * scoped to the reviewer's own browser, not the shared document.
 *
 * Use cases: "great fit, but ask about rider requirements",
 * "saw them at Soho House last month — strong stage presence",
 * "follow up after the venue confirms capacity".
 */
export function InternalNotes({ applicationId }: InternalNotesProps) {
  const key = STORAGE_PREFIX + applicationId;

  // Read initial value via useSyncExternalStore to avoid hydration mismatch
  const stored = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) ?? "";
      } catch {
        return "";
      }
    },
    () => "",
  );

  // Local edit state — initialised to whatever's in storage, then becomes
  // the source of truth as the user types.
  const [value, setValue] = useState(stored);
  const [indicator, setIndicator] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indicatorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setValue(next);
    setIndicator("saving");

    // Schedule a save
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, next);
        window.dispatchEvent(new Event("riffoff:internal-notes-changed"));
      } catch {
        // ignore
      }
      debounceRef.current = null;
      setIndicator("saved");

      if (indicatorRef.current) clearTimeout(indicatorRef.current);
      indicatorRef.current = setTimeout(() => setIndicator("idle"), 1500);
    }, SAVE_DEBOUNCE_MS);
  }

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (indicatorRef.current) clearTimeout(indicatorRef.current);
    };
  }, []);

  const charCount = value.length;
  const charCountColor =
    charCount > 800
      ? "text-rose-400"
      : charCount > 500
        ? "text-amber-400"
        : "text-muted-foreground";

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <Lock className="size-3.5 text-coral" aria-hidden="true" />
          Internal Notes
        </h2>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70">
          {indicator === "saving" && (
            <>
              <Save className="size-3 animate-pulse" aria-hidden="true" />
              Saving…
            </>
          )}
          {indicator === "saved" && (
            <>
              <Check className="size-3 text-emerald-400" aria-hidden="true" />
              Saved
            </>
          )}
        </span>
      </div>

      <p className="mb-2 text-xs text-muted-foreground/70">
        Only visible to you on this device. Not shared with the artist.
      </p>

      <textarea
        value={value}
        onChange={handleChange}
        rows={5}
        maxLength={1000}
        placeholder="Quick notes for yourself — fit assessment, rider requirements, follow-up reminders…"
        className="w-full resize-none rounded-lg border border-border/60 bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 transition-colors focus:border-coral/40 focus:outline-none focus:ring-1 focus:ring-coral/20"
      />

      <p className={`mt-1.5 text-right text-xs ${charCountColor}`}>
        {charCount} / 1000
      </p>
    </section>
  );
}
