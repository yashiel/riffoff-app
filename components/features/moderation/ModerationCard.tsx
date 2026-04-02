"use client";

import Link from "next/link";
import { Calendar, User, MessageSquare, Star, ArrowRight } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { ModerationItemDoc } from "@/lib/appwrite/types";

interface ModerationCardProps {
  item: ModerationItemDoc;
  selected: boolean;
  onSelect: (id: string) => void;
}

const ENTITY_ICONS: Record<string, typeof Calendar> = {
  event: Calendar,
  user: User,
  message: MessageSquare,
  review: Star,
};

const PRIORITY_STRIPE: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-muted-foreground/30",
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-muted text-muted-foreground border-border",
};

const REASON_BADGE: Record<string, string> = {
  scam: "bg-red-500/10 text-red-400 border-red-500/20",
  fraud: "bg-red-500/10 text-red-400 border-red-500/20",
  harassment: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  impersonation: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  inappropriate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  spam: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  wrong_info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const SOURCE_LABELS: Record<string, string> = {
  user: "User Report",
  system: "System Alert",
  admin: "Admin Flag",
};

export function ModerationCard({ item, selected, onSelect }: ModerationCardProps) {
  const Icon = ENTITY_ICONS[item.entityType] ?? Star;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border transition-all duration-200",
        selected
          ? "border-coral/30 bg-coral/[0.03]"
          : "border-border/60 hover:border-border",
      )}
    >
      {/* Priority left stripe */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-[3px]",
          PRIORITY_STRIPE[item.priority] ?? PRIORITY_STRIPE.low,
        )}
      />

      <div className="flex items-center gap-4 px-4 py-3.5 pl-5">
        {/* Checkbox */}
        <label className="flex shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(item.$id)}
            className="size-4 cursor-pointer rounded border-border bg-transparent accent-coral"
            aria-label="Select item"
          />
        </label>

        {/* Entity icon */}
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/80">
          <Icon className="size-4 text-muted-foreground" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Reason */}
            <span
              className={cn(
                "inline-flex rounded-full border px-2.5 py-0.5 text-sm font-medium capitalize",
                REASON_BADGE[item.reason] ?? "bg-muted text-muted-foreground border-border",
              )}
            >
              {item.reason.replace(/_/g, " ")}
            </span>

            {/* Priority */}
            <span
              className={cn(
                "inline-flex rounded-full border px-2.5 py-0.5 text-sm font-bold uppercase tracking-wide",
                PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.low,
              )}
            >
              {item.priority}
            </span>

            {/* Source */}
            <span className="inline-flex rounded-full border border-border/50 bg-muted/50 px-2.5 py-0.5 text-sm text-muted-foreground">
              {SOURCE_LABELS[item.source] ?? item.source}
            </span>
          </div>

          {/* Meta row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{formatRelativeTime(item.$createdAt)}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="capitalize">{item.entityType}</span>
            {item.assignedTo && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="font-medium text-coral">Assigned</span>
              </>
            )}
          </div>
        </div>

        {/* View button */}
        <Link
          href={`/dashboard/admin/moderation/${item.$id}`}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground"
        >
          View
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
