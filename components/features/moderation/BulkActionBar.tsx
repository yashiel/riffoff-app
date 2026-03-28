"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { bulkAssign, bulkDismiss, bulkChangePriority } from "@/actions/moderation";
import type { ModerationPriority } from "@/lib/appwrite/types";

interface BulkActionBarProps {
  selectedIds: string[];
  onClear: () => void;
  onComplete: () => void;
}

const PRIORITIES: ModerationPriority[] = ["low", "medium", "high", "critical"];

export function BulkActionBar({ selectedIds, onClear, onComplete }: BulkActionBarProps) {
  const [isPending, startTransition] = useTransition();
  const [showPriority, setShowPriority] = useState(false);

  if (selectedIds.length === 0) return null;

  function handleDismiss() {
    startTransition(async () => {
      const result = await bulkDismiss(selectedIds);
      if (result.error) {
        alert(result.error);
      } else {
        onComplete();
      }
    });
  }

  function handleAssign() {
    startTransition(async () => {
      // Self-assign — the server action uses the current admin's session
      const result = await bulkAssign(selectedIds);
      if (result.error) {
        alert(result.error);
      } else {
        onComplete();
      }
    });
  }

  function handlePriority(priority: ModerationPriority) {
    setShowPriority(false);
    startTransition(async () => {
      const result = await bulkChangePriority(selectedIds, priority);
      if (result.error) {
        alert(result.error);
      } else {
        onComplete();
      }
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <span className="text-sm font-medium text-foreground">
          {selectedIds.length} selected
        </span>

        <div className="flex flex-1 flex-wrap items-center gap-2">
          <button
            onClick={handleAssign}
            disabled={isPending}
            className="rounded bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
          >
            Assign to Me
          </button>

          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="rounded bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
          >
            Dismiss
          </button>

          <div className="relative">
            <button
              onClick={() => setShowPriority(!showPriority)}
              disabled={isPending}
              className="rounded bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
            >
              Change Priority
            </button>

            {showPriority && (
              <div className="absolute bottom-full left-0 mb-1 rounded-md border border-[var(--border)] bg-background p-1 shadow-lg">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePriority(p)}
                    className="block w-full rounded px-3 py-1.5 text-left text-sm capitalize text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onClear}
          className="flex items-center gap-1 rounded px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
          Clear
        </button>
      </div>
    </div>
  );
}
