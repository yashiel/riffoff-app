"use client";
export const dynamic = "force-dynamic";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  User,
  MessageSquare,
  Star,
  Clock,
} from "lucide-react";
import { cn, formatRelativeTime, formatDate } from "@/lib/utils";
import {
  getModerationDetail,
  assignModerationItem,
  dismissModerationItem,
  actionModerationItem,
  addModerationNote,
  type ModerationDetail,
} from "@/actions/moderation";
import { warnUser, tempBanUser, permanentBanUser } from "@/actions/warnings";
import { suspendEvent, reinstateEvent } from "@/actions/events";
import { StatusBadge } from "@/components/features/shared/StatusBadge";

// ─── Constants ──────────────────────────────────────

const ENTITY_ICONS: Record<string, typeof Calendar> = {
  event: Calendar,
  user: User,
  message: MessageSquare,
  review: Star,
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-muted text-muted-foreground",
};

// ─── Page ───────────────────────────────────────────

export default function ModerationDetailPage() {
  const params = useParams<{ itemId: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<ModerationDetail | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!hasFetchedRef.current && params.itemId) {
      hasFetchedRef.current = true;
      startTransition(async () => {
        const data = await getModerationDetail(params.itemId);
        setDetail(data);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.itemId]);

  function refetch() {
    startTransition(async () => {
      const data = await getModerationDetail(params.itemId);
      setDetail(data);
    });
  }

  function handleDismiss() {
    const note = prompt("Dismiss reason (optional):");
    startTransition(async () => {
      const result = await dismissModerationItem(params.itemId, note ?? "");
      if (result.error) {
        alert(result.error);
      } else {
        router.push("/dashboard/admin/moderation");
      }
    });
  }

  function handleAssign() {
    startTransition(async () => {
      const result = await assignModerationItem(params.itemId);
      if (result.error) {
        alert(result.error);
      } else {
        refetch();
      }
    });
  }

  function handleWarn() {
    if (!detail) return;
    const reason = prompt("Warning reason:");
    if (!reason) return;

    startTransition(async () => {
      const result = await warnUser(detail.item.entityId, reason, detail.item.$id);
      if (result.error) {
        alert(result.error);
      } else {
        await actionModerationItem(params.itemId, "warned", { reason });
        router.push("/dashboard/admin/moderation");
      }
    });
  }

  function handleTempBan(days: number) {
    if (!detail) return;
    setConfirmAction(null);
    const reason = prompt(`Reason for ${days}-day ban:`);
    if (!reason) return;

    startTransition(async () => {
      const result = await tempBanUser(detail.item.entityId, reason, days, detail.item.$id);
      if (result.error) {
        alert(result.error);
      } else {
        await actionModerationItem(params.itemId, `temp_ban_${days}d`, { reason, days });
        router.push("/dashboard/admin/moderation");
      }
    });
  }

  function handlePermanentBan() {
    if (!detail) return;
    if (!confirm("Are you sure you want to permanently ban this user? This will cancel all their events and void their tickets.")) return;
    setConfirmAction(null);

    const reason = prompt("Reason for permanent ban:");
    if (!reason) return;

    startTransition(async () => {
      const result = await permanentBanUser(detail.item.entityId, reason, detail.item.$id);
      if (result.error) {
        alert(result.error);
      } else {
        await actionModerationItem(params.itemId, "permanent_ban", { reason });
        router.push("/dashboard/admin/moderation");
      }
    });
  }

  function handleSuspendEvent() {
    if (!detail) return;
    const reason = prompt("Reason for suspending this event:");
    if (!reason) return;

    startTransition(async () => {
      const result = await suspendEvent(detail.item.entityId, reason);
      if (result.error) {
        alert(result.error);
      } else {
        await actionModerationItem(params.itemId, "event_suspended", { reason });
        router.push("/dashboard/admin/moderation");
      }
    });
  }

  function handleReinstateEvent() {
    if (!detail) return;
    startTransition(async () => {
      const result = await reinstateEvent(detail.item.entityId);
      if (result.error) {
        alert(result.error);
      } else {
        refetch();
      }
    });
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;

    startTransition(async () => {
      const result = await addModerationNote(params.itemId, noteText);
      if (result.error) {
        alert(result.error);
      } else {
        setNoteText("");
        refetch();
      }
    });
  }

  if (!detail) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {isPending ? "Loading..." : "Moderation item not found"}
      </div>
    );
  }

  const { item, entityPreview, relatedReports, notes } = detail;
  const Icon = ENTITY_ICONS[item.entityType] ?? Star;
  const isResolved = item.status === "actioned" || item.status === "dismissed";

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/admin/moderation"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to queue
        </Link>
        <StatusBadge status={item.status} />
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold uppercase",
            PRIORITY_COLORS[item.priority] ?? PRIORITY_COLORS.low,
          )}
        >
          {item.priority}
        </span>
      </div>

      {/* Entity Preview */}
      <div className="mt-6 rounded-lg border border-[var(--border)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase text-muted-foreground">{entityPreview.type}</p>
            <p className="mt-0.5 text-lg font-medium text-foreground">{entityPreview.label}</p>
            {entityPreview.detail && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                {entityPreview.detail}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Report Info */}
      <div className="mt-4 rounded-lg border border-[var(--border)] p-4">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Report Details</h2>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Reason</span>
            <span className="font-medium capitalize text-foreground">{item.reason}</span>
          </div>
          {item.description && (
            <div>
              <span className="text-muted-foreground">Description</span>
              <p className="mt-1 text-foreground">{item.description}</p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Source</span>
            <span className="capitalize text-foreground">
              {item.source === "user" ? "User Report" : item.source === "system" ? "System Alert" : "Admin Flag"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Filed</span>
            <span className="flex items-center gap-1 text-foreground">
              <Clock className="size-3" />
              {formatDate(item.$createdAt)}
            </span>
          </div>
          {item.reporterId && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Reporter</span>
              <span className="text-foreground">User #{item.reporterId.slice(-6)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Entity History */}
      {relatedReports.length > 0 && (
        <div className="mt-4 rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-sm font-medium uppercase text-muted-foreground">
            Related Reports ({relatedReports.length})
          </h2>
          <div className="mt-2 space-y-1.5">
            {relatedReports.slice(0, 5).map((r) => (
              <div key={r.$id} className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">{r.reason}</span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(r.$createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes Timeline */}
      <div className="mt-4 rounded-lg border border-[var(--border)] p-4">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          Notes ({notes.length})
        </h2>

        {notes.length > 0 ? (
          <div className="mt-3 space-y-3">
            {notes.map((note) => (
              <div key={note.$id} className="border-l-2 border-[var(--border)] pl-3">
                <p className="text-sm text-foreground">{note.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Admin #{note.authorId.slice(-6)} &middot;{" "}
                  {formatRelativeTime(note.$createdAt)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No notes yet</p>
        )}

        {/* Add note form */}
        <form onSubmit={handleAddNote} className="mt-4 flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 rounded-md border border-[var(--border)] bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-coral focus:outline-none"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={isPending || !noteText.trim()}
            className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>

      {/* Action Panel */}
      {!isResolved && (
        <div className="mt-4 rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-sm font-medium uppercase text-muted-foreground">Actions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              disabled={isPending}
              className="rounded bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
            >
              Dismiss
            </button>

            {/* Warn */}
            <button
              onClick={handleWarn}
              disabled={isPending}
              className="rounded bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
            >
              Warn User
            </button>

            {/* Temp Ban dropdown */}
            <div className="relative">
              <button
                onClick={() => setConfirmAction(confirmAction === "tempBan" ? null : "tempBan")}
                disabled={isPending}
                className="rounded bg-orange-500/10 px-3 py-1.5 text-sm font-medium text-orange-400 transition-colors hover:bg-orange-500/20 disabled:opacity-50"
              >
                Temp Ban
              </button>
              {confirmAction === "tempBan" && (
                <div className="absolute left-0 top-full z-10 mt-1 rounded-md border border-[var(--border)] bg-background p-1 shadow-lg">
                  {[1, 7, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => handleTempBan(d)}
                      className="block w-full rounded px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {d} day{d > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Permanent Ban */}
            <button
              onClick={handlePermanentBan}
              disabled={isPending}
              className="rounded bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
            >
              Permanent Ban
            </button>

            {/* Event-specific actions */}
            {item.entityType === "event" && (
              <>
                <button
                  onClick={handleSuspendEvent}
                  disabled={isPending}
                  className="rounded bg-orange-500/10 px-3 py-1.5 text-sm font-medium text-orange-400 transition-colors hover:bg-orange-500/20 disabled:opacity-50"
                >
                  Suspend Event
                </button>
                <button
                  onClick={handleReinstateEvent}
                  disabled={isPending}
                  className="rounded bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  Reinstate Event
                </button>
              </>
            )}

            {/* Assign to me */}
            {!item.assignedTo && (
              <button
                onClick={handleAssign}
                disabled={isPending}
                className="rounded bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
              >
                Assign to Me
              </button>
            )}
          </div>
        </div>
      )}

      {/* Resolved info */}
      {isResolved && (
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Resolved: </span>
            {item.status === "actioned" ? `Action taken: ${item.actionTaken?.replace(/_/g, " ") ?? "Unknown"}` : "Dismissed"}
            {item.resolvedAt && <> &middot; {formatDate(item.resolvedAt)}</>}
          </p>
        </div>
      )}
    </div>
  );
}
