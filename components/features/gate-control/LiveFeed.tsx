"use client";

import { useEffect, useRef } from "react";
import { Activity, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { FeedEntry } from "@/hooks/use-gate-stream";

interface LiveFeedProps {
  eventId: string;
  /** Check-in feed entries from SSE stream */
  entries: FeedEntry[];
}

const STATUS_CONFIG = {
  valid: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-400/[0.06]",
    border: "border-emerald-400/10",
    label: "Valid",
  },
  invalid: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-400/[0.06]",
    border: "border-red-400/10",
    label: "Invalid",
  },
  duplicate: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-400/[0.06]",
    border: "border-amber-400/10",
    label: "Duplicate",
  },
} as const;

/**
 * Scrolling list of recent check-ins — powered by SSE (no polling).
 * Receives entries from parent CommandCenter via the unified gate stream.
 */
export function LiveFeed({ entries }: LiveFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="flex size-7 items-center justify-center rounded-lg bg-muted">
            <Activity className="size-3.5 text-coral" />
          </div>
          Live Feed
        </h2>
        {entries.length > 0 && (
          <span className="rounded-full bg-coral/10 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-coral">
            {entries.length}
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="mt-3 flex-1 space-y-1 overflow-y-auto rounded-2xl border border-border bg-muted/60 p-2"
        style={{ maxHeight: "340px" }}
      >
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
              <Activity className="size-5 text-muted-foreground/50" />
            </div>
            <p className="mt-3 text-base text-muted-foreground/70">Waiting for scans...</p>
            <p className="mt-1 text-sm text-muted-foreground/50">
              Scans will appear here in real-time
            </p>
          </div>
        ) : (
          entries.map((entry, i) => {
            const config = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.valid;
            const Icon = config.icon;
            const isNew = i === 0;

            return (
              <div
                key={entry.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                  config.border
                } ${config.bg} ${isNew ? "animate-in fade-in slide-in-from-top-1 duration-300" : ""}`}
              >
                <Icon className={`size-4 shrink-0 ${config.color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-base font-bold ${config.color}`}>
                      {entry.ticketCode}
                    </span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-medium text-muted-foreground/80">
                      {entry.gateName}
                    </span>
                  </div>
                </div>
                <time className="shrink-0 text-sm tabular-nums text-muted-foreground/70">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </time>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
