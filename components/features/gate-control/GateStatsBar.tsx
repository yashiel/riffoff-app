"use client";

import { useEffect, useState } from "react";
import { Users, TrendingUp, Zap } from "lucide-react";

interface GateStatsBarProps {
  checkedIn: number;
  totalTickets: number;
}

export function GateStatsBar({ checkedIn, totalTickets }: GateStatsBarProps) {
  const pct = totalTickets > 0 ? Math.round((checkedIn / totalTickets) * 100) : 0;
  const remaining = totalTickets - checkedIn;

  // Animate the counter on mount
  const [displayCount, setDisplayCount] = useState(0);
  useEffect(() => {
    if (checkedIn === 0) return;
    const step = Math.max(1, Math.floor(checkedIn / 30));
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, checkedIn);
      setDisplayCount(current);
      if (current >= checkedIn) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [checkedIn]);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Main check-in stat — large hero card */}
      <div className="relative overflow-hidden rounded-2xl border border-coral/20 bg-gradient-to-br from-coral/[0.08] to-transparent p-5 sm:col-span-2">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-coral/10 blur-3xl" />

        <div className="relative flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-coral/15">
                <Users className="size-4.5 text-coral" />
              </div>
              <span className="text-base font-medium text-muted-foreground">Checked In</span>
            </div>
            <p className="mt-3 font-display text-5xl tabular-nums tracking-tight text-foreground sm:text-6xl">
              {displayCount.toLocaleString()}
            </p>
            <p className="mt-1 text-base text-muted-foreground">
              of {totalTickets.toLocaleString()} tickets sold
            </p>
          </div>

          {/* Circular progress */}
          <div className="relative flex size-20 items-center justify-center">
            <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40" cy="40" r="34"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                className="text-muted-foreground/50"
              />
              <circle
                cx="40" cy="40" r="34"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
                className="text-coral transition-all duration-1000 ease-out"
              />
            </svg>
            <span className="absolute text-lg font-bold tabular-nums text-coral">
              {pct}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-coral to-coral/60 transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      {/* Side stats */}
      <div className="flex flex-col gap-4">
        <div className="flex-1 rounded-2xl border border-border bg-muted/70 p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-400/10">
              <TrendingUp className="size-4 text-emerald-400" />
            </div>
            <span className="text-base text-muted-foreground">Rate</span>
          </div>
          <p className="mt-2 font-display text-2xl tabular-nums text-foreground">
            {checkedIn > 0 ? "~12" : "0"}
            <span className="text-base font-normal text-muted-foreground/80">/min</span>
          </p>
        </div>

        <div className="flex-1 rounded-2xl border border-border bg-muted/70 p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-400/10">
              <Zap className="size-4 text-violet-400" />
            </div>
            <span className="text-base text-muted-foreground">Remaining</span>
          </div>
          <p className="mt-2 font-display text-2xl tabular-nums text-foreground">
            {remaining.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
