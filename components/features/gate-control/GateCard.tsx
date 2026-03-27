"use client";

import { useTransition } from "react";
import { Lock, Unlock, Smartphone, AlertTriangle, Clock, DoorOpen } from "lucide-react";
import { lockGate, unlockGate } from "@/actions/gate";

interface GateCardProps {
  gateId: string;
  gateName: string;
  status: string;
  checkedIn: number;
  devices: number;
  conflicts: number;
  lastScan?: string;
  eventId: string;
}

export function GateCard({
  gateId,
  gateName,
  status,
  checkedIn,
  devices,
  conflicts,
  lastScan,
  eventId,
}: GateCardProps) {
  const [isPending, startTransition] = useTransition();
  const isLocked = status === "locked";
  const isClosed = status === "closed";

  function handleToggleLock() {
    startTransition(async () => {
      if (isLocked) {
        await unlockGate(eventId, gateId);
      } else {
        await lockGate(eventId, gateId);
      }
    });
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        isLocked
          ? "border-red-400/20 bg-red-400/[0.03]"
          : isClosed
            ? "border-border bg-muted/50 opacity-60"
            : "border-border bg-muted/70 hover:border-border"
      }`}
    >
      {/* Top accent line */}
      <div
        className={`h-0.5 w-full ${
          isLocked
            ? "bg-gradient-to-r from-red-400/60 via-red-400/30 to-transparent"
            : isClosed
              ? "bg-muted"
              : "bg-gradient-to-r from-emerald-400/60 via-emerald-400/30 to-transparent"
        }`}
      />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 items-center justify-center rounded-xl ${
                isLocked
                  ? "bg-red-400/10"
                  : "bg-muted"
              }`}
            >
              <DoorOpen className={`size-5 ${isLocked ? "text-red-400" : "text-muted-foreground"}`} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{gateName}</h3>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className={`inline-block size-1.5 rounded-full ${
                    isLocked ? "bg-red-400" : isClosed ? "bg-muted" : "bg-emerald-400 animate-pulse"
                  }`}
                />
                <span className={`text-sm font-medium uppercase tracking-wider ${
                  isLocked ? "text-red-400/70" : isClosed ? "text-muted-foreground/80" : "text-emerald-400/70"
                }`}>
                  {status}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleToggleLock}
            disabled={isPending || isClosed}
            aria-label={isLocked ? `Unlock ${gateName}` : `Lock ${gateName}`}
            className={`rounded-xl p-2.5 transition-all duration-200 disabled:opacity-40 ${
              isLocked
                ? "bg-red-400/10 text-red-400 hover:bg-red-400/20 hover:scale-105"
                : "bg-muted text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-105"
            }`}
          >
            {isLocked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
          </button>
        </div>

        {/* Stats grid */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-muted/80 px-3 py-2.5">
            <p className="text-sm text-muted-foreground/80">Scanned</p>
            <p className="mt-0.5 font-display text-xl tabular-nums text-foreground">
              {checkedIn}
            </p>
          </div>
          <div className="rounded-xl bg-muted/80 px-3 py-2.5">
            <div className="flex items-center gap-1">
              <Smartphone className="size-3 text-muted-foreground/80" />
              <p className="text-sm text-muted-foreground/80">Devices</p>
            </div>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
              {devices}
            </p>
          </div>
          {conflicts > 0 ? (
            <div className="rounded-xl bg-amber-400/[0.06] px-3 py-2.5">
              <div className="flex items-center gap-1">
                <AlertTriangle className="size-3 text-amber-400" />
                <p className="text-sm text-amber-400/70">Conflicts</p>
              </div>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-amber-400">
                {conflicts}
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-muted/80 px-3 py-2.5">
              <p className="text-sm text-muted-foreground/80">Conflicts</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-400/60">
                0
              </p>
            </div>
          )}
        </div>

        {/* Last scan timestamp */}
        {lastScan && (
          <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground/70">
            <Clock className="size-3" />
            <span>Last scan {new Date(lastScan).toLocaleTimeString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
