"use client";

import type { LucideIcon } from "lucide-react";

export type ActionTone = "amber" | "emerald" | "rose" | "neutral";

const TONE_CLASSES: Record<
  ActionTone,
  { current: string; idle: string }
> = {
  amber: {
    current:
      "bg-amber-500/25 text-amber-900 dark:text-amber-100 ring-amber-500/50 cursor-default",
    idle:
      "bg-background/40 ring-border/60 text-foreground hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300 hover:ring-amber-500/40",
  },
  emerald: {
    current:
      "bg-emerald-500/25 text-emerald-900 dark:text-emerald-100 ring-emerald-500/50 cursor-default",
    idle:
      "bg-background/40 ring-border/60 text-foreground hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300 hover:ring-emerald-500/40",
  },
  rose: {
    current:
      "bg-rose-500/25 text-rose-900 dark:text-rose-100 ring-rose-500/50 cursor-default",
    idle:
      "bg-background/40 ring-border/60 text-foreground hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 hover:ring-rose-500/40",
  },
  neutral: {
    current:
      "bg-muted text-foreground ring-border cursor-default",
    idle:
      "bg-background/40 ring-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
  },
};

interface StatusActionPillProps {
  label: string;
  Icon: LucideIcon;
  tone: ActionTone;
  /** True when this pill represents the application's current status */
  isCurrent: boolean;
  disabled: boolean;
  onClick: () => void;
  /** Optional subtle suffix shown after the label when current */
  currentSuffix?: string;
}

/**
 * Reusable filled-when-current pill button for status changes.
 *
 * Used by both the inline ApplicationCard action row and the
 * OrganiserDecisionCard's primary decision row. Light/dark adaptive
 * tones, `aria-current` semantics for accessibility.
 */
export function StatusActionPill({
  label,
  Icon,
  tone,
  isCurrent,
  disabled,
  onClick,
  currentSuffix,
}: StatusActionPillProps) {
  const cls = TONE_CLASSES[tone];
  return (
    <button
      type="button"
      onClick={isCurrent ? undefined : onClick}
      disabled={disabled || isCurrent}
      aria-pressed={isCurrent}
      aria-current={isCurrent ? "true" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
        isCurrent ? cls.current : cls.idle
      }`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
      {isCurrent && currentSuffix && (
        <span className="ml-0.5 text-[10px] uppercase tracking-wider opacity-80">
          {currentSuffix}
        </span>
      )}
    </button>
  );
}
