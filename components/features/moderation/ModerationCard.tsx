"use client";

import Link from "next/link";
import {
  Calendar,
  User,
  MessageSquare,
  Star,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { ModerationItemDoc } from "@/lib/appwrite/types";

// ─── Props ──────────────────────────────────────────

interface ModerationCardProps {
  item: ModerationItemDoc;
  selected: boolean;
  onSelect: (id: string) => void;
}

// ─── Constants ──────────────────────────────────────

const ENTITY_ICONS: Record<string, typeof Calendar> = {
  event: Calendar,
  user: User,
  message: MessageSquare,
  review: Star,
};

const REASON_COLORS: Record<string, string> = {
  scam: "bg-red-500/10 text-red-400 border-red-500/20",
  fraud: "bg-red-500/10 text-red-400 border-red-500/20",
  harassment: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  impersonation: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  inappropriate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  spam: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  duplicate: "bg-muted text-muted-foreground",
  other: "bg-muted text-muted-foreground",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-muted text-muted-foreground",
};

const SOURCE_LABELS: Record<string, string> = {
  user: "User Report",
  system: "System Alert",
  admin: "Admin Flag",
};

// ─── Component ──────────────────────────────────────

export function ModerationCard({ item, selected, onSelect }: ModerationCardProps) {
  const Icon = ENTITY_ICONS[item.entityType] ?? Star;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-[var(--border)] p-4 transition-colors",
        selected
          ? "bg-[rgba(255,255,255,0.04)] border-coral/30"
          : "hover:bg-[rgba(255,255,255,0.02)]",
      )}
    >
      {/* Checkbox */}
      <label className="flex shrink-0 cursor-pointer items-center pt-0.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(item.$id)}
          className="size-4 cursor-pointer rounded border-[var(--border)] bg-transparent accent-coral"
        />
      </label>

      {/* Entity icon */}
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Reason badge */}
          <span
            className={cn(
              "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
              REASON_COLORS[item.reason] ?? REASON_COLORS.other,
            )}
          >
            {item.reason}
          </span>

          {/* Priority badge */}
          <span
            className={cn(
              "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold uppercase",
              PRIORITY_COLORS[item.priority] ?? PRIORITY_COLORS.low,
            )}
          >
            {item.priority}
          </span>

          {/* Source badge */}
          <span className="inline-flex rounded-full border border-[var(--border)] bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {SOURCE_LABELS[item.source] ?? item.source}
          </span>
        </div>

        {/* Description */}
        {item.description && (
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
            {item.description.length > 100
              ? item.description.slice(0, 100) + "..."
              : item.description}
          </p>
        )}

        {/* Meta row */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {formatRelativeTime(item.$createdAt)}
          </span>
          <span className="capitalize">{item.entityType}</span>
          {item.assignedTo && (
            <span className="text-coral">Assigned</span>
          )}
        </div>
      </div>

      {/* Detail link */}
      <Link
        href={`/dashboard/admin/moderation/${item.$id}`}
        className="shrink-0 rounded px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        View
      </Link>
    </div>
  );
}
