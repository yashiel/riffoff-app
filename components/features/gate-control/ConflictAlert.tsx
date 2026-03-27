"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface Conflict {
  gateId: string;
  gateName: string;
  conflicts: number;
}

interface ConflictAlertProps {
  conflicts: Conflict[];
}

export function ConflictAlert({ conflicts }: ConflictAlertProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = conflicts.filter((c) => !dismissed.has(c.gateId));
  if (visible.length === 0) return null;

  function dismiss(gateId: string) {
    setDismissed((prev) => new Set(prev).add(gateId));
  }

  return (
    <div className="space-y-2">
      {visible.map((conflict) => (
        <div
          key={conflict.gateId}
          className="flex items-center justify-between rounded-xl border border-amber-400/20 bg-amber-400/[0.04] px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-400" />
            <p className="text-base text-foreground">
              <span className="font-semibold">{conflict.gateName}</span>
              {" — "}
              <span className="text-amber-400">
                {conflict.conflicts} duplicate scan{conflict.conflicts !== 1 ? "s" : ""} detected
              </span>
            </p>
          </div>
          <button
            onClick={() => dismiss(conflict.gateId)}
            aria-label={`Dismiss conflict alert for ${conflict.gateName}`}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
