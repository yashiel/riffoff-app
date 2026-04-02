"use client";

import { useEffect, useRef } from "react";
import { Activity, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import Image from "next/image";
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
    label: "Approved",
  },
  invalid: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-400/[0.06]",
    border: "border-red-400/10",
    label: "Denied",
  },
  duplicate: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-400/[0.06]",
    border: "border-amber-400/10",
    label: "Duplicate",
  },
} as const;

/** Deterministic color from first character of name */
function avatarColor(name: string): string {
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#10b981", "#06b6d4"];
  const code = (name || "?").charCodeAt(0);
  return colors[code % colors.length];
}

/** Tier badge with contextual color */
function TierBadge({ tier }: { tier: string }) {
  const lower = tier.toLowerCase();
  const isVip = lower.includes("vip");
  const isEarly = lower.includes("early");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold leading-none ${
        isVip
          ? "bg-amber-500/15 text-amber-400"
          : isEarly
            ? "bg-blue-500/15 text-blue-400"
            : "bg-muted text-muted-foreground"
      }`}
    >
      {tier}
    </span>
  );
}

/**
 * Scrolling list of recent check-ins — powered by polling.
 * Shows attendee photo, name, tier badge, ticket code, gate, and timestamp.
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
        className="mt-3 flex-1 space-y-1.5 overflow-y-auto rounded-2xl border border-border bg-muted/60 p-2"
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
            const name = entry.attendeeName || "Unknown";
            const initial = name.charAt(0).toUpperCase();

            return (
              <div
                key={entry.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                  config.border
                } ${config.bg} ${isNew ? "animate-in fade-in slide-in-from-top-1 duration-300" : ""}`}
              >
                {/* Status icon */}
                <Icon className={`size-4 shrink-0 ${config.color}`} />

                {/* Attendee photo / initials */}
                <div className="relative size-9 shrink-0">
                  {entry.attendeePhotoUrl ? (
                    <Image
                      src={entry.attendeePhotoUrl}
                      alt={name}
                      width={36}
                      height={36}
                      className="size-9 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex size-9 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: avatarColor(name) }}
                    >
                      {initial}
                    </div>
                  )}
                </div>

                {/* Name + tier + code */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-base font-semibold text-foreground">
                      {name}
                    </span>
                    {entry.tierName && <TierBadge tier={entry.tierName} />}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono">{entry.ticketCode}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
                      {entry.gateName}
                    </span>
                  </div>
                </div>

                {/* Timestamp */}
                <time className="shrink-0 text-sm tabular-nums text-muted-foreground/70">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </time>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
