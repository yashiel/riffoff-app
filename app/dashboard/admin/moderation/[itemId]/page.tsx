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
  CheckCircle2,
  XCircle,
  ChevronDown,
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

// ─── Pending Action type ─────────────────────────────

interface PendingAction {
  type: "dismiss" | "warn" | "temp_ban" | "permanent_ban" | "suspend_event";
  label: string;
  description: string;
  placeholder: string;
  days?: number;
  danger?: boolean;
  optional?: boolean;
}

// ─── Page ───────────────────────────────────────────

export default function ModerationDetailPage() {
  const params = useParams<{ itemId: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<ModerationDetail | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [tempBanOpen, setTempBanOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!hasFetchedRef.current && params.itemId) {
      hasFetchedRef.current = true;
      startTransition(async () => {
        const data = await getModerationDetail(params.itemId);
        setDetail(data);
      });
    }
  }, [params.itemId]);

  function refetch() {
    startTransition(async () => {
      const data = await getModerationDetail(params.itemId);
      setDetail(data);
    });
  }

  function openAction(action: PendingAction) {
    setPendingAction(action);
    setReasonText("");
    setActionError(null);
    setTempBanOpen(false);
  }

  function cancelAction() {
    setPendingAction(null);
    setReasonText("");
    setActionError(null);
  }

  function handleConfirmAction() {
    if (!detail || !pendingAction) return;

    const reason = reasonText.trim();
    if (!reason && !pendingAction.optional) {
      setActionError("Please provide a reason.");
      return;
    }

    setActionError(null);

    startTransition(async () => {
      let result: { error?: string } = {};

      if (pendingAction.type === "dismiss") {
        result = await dismissModerationItem(params.itemId, reason);
        if (!result.error) router.push("/dashboard/admin/moderation");
      } else if (pendingAction.type === "warn") {
        result = await warnUser(detail.item.entityId, reason, detail.item.$id);
        if (!result.error) {
          await actionModerationItem(params.itemId, "warned", { reason });
          router.push("/dashboard/admin/moderation");
        }
      } else if (pendingAction.type === "temp_ban") {
        result = await tempBanUser(
          detail.item.entityId,
          reason,
          pendingAction.days ?? 7,
          detail.item.$id,
        );
        if (!result.error) {
          await actionModerationItem(params.itemId, `temp_ban_${pendingAction.days}d`, {
            reason,
            days: pendingAction.days,
          });
          router.push("/dashboard/admin/moderation");
        }
      } else if (pendingAction.type === "permanent_ban") {
        result = await permanentBanUser(detail.item.entityId, reason, detail.item.$id);
        if (!result.error) {
          await actionModerationItem(params.itemId, "permanent_ban", { reason });
          router.push("/dashboard/admin/moderation");
        }
      } else if (pendingAction.type === "suspend_event") {
        result = await suspendEvent(detail.item.entityId, reason);
        if (!result.error) {
          await actionModerationItem(params.itemId, "event_suspended", { reason });
          router.push("/dashboard/admin/moderation");
        }
      }

      if (result.error) {
        setActionError(result.error);
      }
    });
  }

  function handleAssign() {
    startTransition(async () => {
      const result = await assignModerationItem(params.itemId);
      if (!result.error) refetch();
    });
  }

  function handleReinstateEvent() {
    if (!detail) return;
    startTransition(async () => {
      const result = await reinstateEvent(detail.item.entityId);
      if (!result.error) refetch();
    });
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;

    startTransition(async () => {
      const result = await addModerationNote(params.itemId, noteText);
      if (!result.error) {
        setNoteText("");
        refetch();
      }
    });
  }

  // ─── Loading state ──────────────────────────────────

  if (!detail && isPending) {
    return (
      <div className="max-w-3xl space-y-4 pb-12">
        <div className="h-6 w-32 animate-pulse rounded-md bg-muted/50" />
        <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
        <div className="h-48 animate-pulse rounded-xl bg-muted/40" />
        <div className="h-32 animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-base font-medium text-foreground">Item not found</p>
        <Link
          href="/dashboard/admin/moderation"
          className="mt-3 text-base text-coral hover:underline"
        >
          Back to queue
        </Link>
      </div>
    );
  }

  const { item, entityPreview, relatedReports, notes } = detail;
  const Icon = ENTITY_ICONS[item.entityType] ?? Star;
  const isResolved = item.status === "actioned" || item.status === "dismissed";

  return (
    <div className="max-w-3xl pb-12">
      {/* Back nav + status */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/admin/moderation"
          className="flex items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to queue
        </Link>
        <div className="h-4 w-px bg-border/60" />
        <StatusBadge status={item.status} />
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-0.5 text-sm font-bold uppercase tracking-wide",
            PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.low,
          )}
        >
          {item.priority}
        </span>
        {item.assignedTo && (
          <span className="text-base font-medium text-coral">Assigned to you</span>
        )}
      </div>

      {/* Entity Preview */}
      <div className="relative mt-6 overflow-hidden rounded-xl border border-border/60">
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-[3px]",
            PRIORITY_STRIPE[item.priority] ?? PRIORITY_STRIPE.low,
          )}
        />
        <div className="flex items-start gap-4 p-5 pl-6">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted/80">
            <Icon className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {entityPreview.type}
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">{entityPreview.label}</p>
            {entityPreview.detail && (
              <p className="mt-1.5 text-base text-muted-foreground line-clamp-3">
                {entityPreview.detail}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Report Details */}
      <div className="mt-4 rounded-xl border border-border/60 p-5">
        <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
          Report Details
        </h2>
        <dl className="mt-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-base text-muted-foreground">Reason</dt>
            <dd className="text-right text-base font-medium capitalize text-foreground">
              {item.reason.replace(/_/g, " ")}
            </dd>
          </div>

          {item.description && (
            <div className="border-t border-border/40 pt-3">
              <dt className="text-base text-muted-foreground">Description</dt>
              <dd className="mt-1.5 text-base text-foreground">{item.description}</dd>
            </div>
          )}

          <div className="flex items-start justify-between gap-4 border-t border-border/40 pt-3">
            <dt className="text-base text-muted-foreground">Source</dt>
            <dd className="text-right text-base text-foreground">
              {item.source === "user"
                ? "User Report"
                : item.source === "system"
                  ? "System Alert"
                  : "Admin Flag"}
            </dd>
          </div>

          <div className="flex items-start justify-between gap-4 border-t border-border/40 pt-3">
            <dt className="text-base text-muted-foreground">Filed</dt>
            <dd className="flex items-center gap-1.5 text-right text-base text-foreground">
              <Clock className="size-3.5 shrink-0 text-muted-foreground/60" />
              {formatDate(item.$createdAt)}
            </dd>
          </div>

          {item.reporterId && (
            <div className="flex items-start justify-between gap-4 border-t border-border/40 pt-3">
              <dt className="text-base text-muted-foreground">Reporter</dt>
              <dd className="text-right font-mono text-base text-foreground">
                #{item.reporterId.slice(-8)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Related Reports */}
      {relatedReports.length > 0 && (
        <div className="mt-4 rounded-xl border border-border/60 p-5">
          <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
            Related Reports
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-sm font-bold text-foreground">
              {relatedReports.length}
            </span>
          </h2>
          <div className="mt-4 space-y-2">
            {relatedReports.slice(0, 5).map((r) => (
              <div
                key={r.$id}
                className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3"
              >
                <span className="text-base capitalize text-foreground">
                  {r.reason.replace(/_/g, " ")}
                </span>
                <span className="text-base text-muted-foreground">
                  {formatRelativeTime(r.$createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes Timeline */}
      <div className="mt-4 rounded-xl border border-border/60 p-5">
        <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
          Notes
          {notes.length > 0 && (
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-sm font-bold text-foreground">
              {notes.length}
            </span>
          )}
        </h2>

        {notes.length > 0 ? (
          <div className="mt-4 space-y-4">
            {notes.map((note) => (
              <div key={note.$id} className="flex gap-3">
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  A
                </div>
                <div className="min-w-0 flex-1 rounded-lg bg-muted/30 px-4 py-3">
                  <p className="text-base text-foreground">{note.body}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Admin #{note.authorId.slice(-6)} &middot;{" "}
                    {formatRelativeTime(note.$createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-base text-muted-foreground">No notes yet.</p>
        )}

        {/* Add note form */}
        <form onSubmit={handleAddNote} className="mt-5 flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add an internal note..."
            className="flex-1 rounded-lg border border-border/60 bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-coral focus:outline-none"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={isPending || !noteText.trim()}
            className="rounded-lg border border-border/60 bg-muted px-4 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-40"
          >
            Add
          </button>
        </form>
      </div>

      {/* Action Panel */}
      {!isResolved && (
        <div className="mt-4 rounded-xl border border-border/60 p-5">
          <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
            Actions
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {/* Dismiss */}
            <button
              onClick={() =>
                openAction({
                  type: "dismiss",
                  label: "Dismiss Report",
                  description: "Mark this report as not requiring action.",
                  placeholder: "Reason for dismissing (optional)...",
                  optional: true,
                })
              }
              disabled={isPending}
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-base font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
            >
              Dismiss
            </button>

            {/* Warn User */}
            {item.entityType !== "event" && (
              <button
                onClick={() =>
                  openAction({
                    type: "warn",
                    label: "Warn User",
                    description: "Issue a formal warning. The user will be notified.",
                    placeholder: "Reason for warning...",
                  })
                }
                disabled={isPending}
                className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-base font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-40"
              >
                Warn User
              </button>
            )}

            {/* Temp Ban */}
            {item.entityType !== "event" && (
              <div className="relative">
                <button
                  onClick={() => setTempBanOpen((v) => !v)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-base font-medium text-orange-400 transition-colors hover:bg-orange-500/20 disabled:opacity-40"
                >
                  Temp Ban
                  <ChevronDown className={cn("size-4 transition-transform", tempBanOpen && "rotate-180")} />
                </button>
                {tempBanOpen && (
                  <div className="absolute left-0 top-full z-10 mt-1.5 min-w-[140px] rounded-xl border border-border/60 bg-background p-1.5 shadow-xl">
                    {[1, 7, 30].map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          setTempBanOpen(false);
                          openAction({
                            type: "temp_ban",
                            label: `${d}-Day Ban`,
                            description: `Temporarily restrict this user for ${d} day${d > 1 ? "s" : ""}.`,
                            placeholder: "Reason for ban...",
                            days: d,
                            danger: true,
                          });
                        }}
                        className="block w-full rounded-lg px-3 py-2.5 text-left text-base text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {d} day{d > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Permanent Ban */}
            {item.entityType !== "event" && (
              <button
                onClick={() =>
                  openAction({
                    type: "permanent_ban",
                    label: "Permanent Ban",
                    description:
                      "Permanently restrict this user. All their events will be cancelled and tickets voided.",
                    placeholder: "Reason for permanent ban...",
                    danger: true,
                  })
                }
                disabled={isPending}
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-base font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-40"
              >
                Permanent Ban
              </button>
            )}

            {/* Event actions */}
            {item.entityType === "event" && (
              <>
                <button
                  onClick={() =>
                    openAction({
                      type: "suspend_event",
                      label: "Suspend Event",
                      description: "Take the event offline pending review.",
                      placeholder: "Reason for suspending this event...",
                      danger: true,
                    })
                  }
                  disabled={isPending}
                  className="rounded-lg border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-base font-medium text-orange-400 transition-colors hover:bg-orange-500/20 disabled:opacity-40"
                >
                  Suspend Event
                </button>
                <button
                  onClick={handleReinstateEvent}
                  disabled={isPending}
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-base font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
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
                className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-base font-medium text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-40"
              >
                Assign to Me
              </button>
            )}
          </div>

          {/* Inline action confirmation */}
          {pendingAction && (
            <div
              className={cn(
                "mt-5 rounded-xl border p-5",
                pendingAction.danger
                  ? "border-red-500/20 bg-red-500/[0.04]"
                  : "border-border/60 bg-muted/20",
              )}
            >
              <p className="text-base font-semibold text-foreground">{pendingAction.label}</p>
              <p className="mt-1 text-base text-muted-foreground">{pendingAction.description}</p>

              <textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder={pendingAction.placeholder}
                rows={3}
                className="mt-4 w-full resize-none rounded-lg border border-border/60 bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-coral focus:outline-none"
                disabled={isPending}
              />

              {actionError && (
                <p className="mt-2 text-base text-red-400">{actionError}</p>
              )}

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleConfirmAction}
                  disabled={isPending || (!pendingAction.optional && !reasonText.trim())}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-5 py-2.5 text-base font-semibold transition-colors disabled:opacity-40",
                    pendingAction.danger
                      ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                      : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25",
                  )}
                >
                  <CheckCircle2 className="size-4" />
                  Confirm
                </button>
                <button
                  onClick={cancelAction}
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-lg border border-border/60 px-5 py-2.5 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <XCircle className="size-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resolved banner */}
      {isResolved && (
        <div className="mt-4 flex items-start gap-4 rounded-xl border border-border/60 bg-muted/20 p-5">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />
          <div>
            <p className="text-base font-semibold text-foreground">
              {item.status === "actioned" ? "Action taken" : "Dismissed"}
            </p>
            {item.status === "actioned" && item.actionTaken && (
              <p className="mt-0.5 text-base capitalize text-muted-foreground">
                {item.actionTaken.replace(/_/g, " ")}
              </p>
            )}
            {item.resolvedAt && (
              <p className="mt-0.5 text-base text-muted-foreground">
                {formatDate(item.resolvedAt)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
