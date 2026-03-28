"use client";
export const dynamic = "force-dynamic";

import { useState, useTransition, useEffect, useRef } from "react";
import { Clock } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  listAppeals,
  reviewAppeal,
  type AppealListItem,
} from "@/actions/appeals";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import type { AppealStatus } from "@/lib/appwrite/types";

// ─── Constants ──────────────────────────────────────

const STATUS_TABS: Array<{ label: string; value: AppealStatus | undefined }> = [
  { label: "All", value: undefined },
  { label: "Pending", value: "pending" },
  { label: "Under Review", value: "under_review" },
  { label: "Upheld", value: "upheld" },
  { label: "Overturned", value: "overturned" },
];

const PAGE_SIZE = 20;

// ─── Page ───────────────────────────────────────────

export default function AdminAppealsPage() {
  const [appeals, setAppeals] = useState<AppealListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<AppealStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasFetchedRef = useRef(false);

  function fetchAppeals(p = page, s = status) {
    startTransition(async () => {
      const result = await listAppeals(s, p, PAGE_SIZE);
      setAppeals(result.appeals);
      setTotal(result.total);
    });
  }

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchAppeals(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStatusChange(s: AppealStatus | undefined) {
    setStatus(s);
    setPage(1);
    setExpandedId(null);
    fetchAppeals(1, s);
  }

  function handleReview(appealId: string, decision: "upheld" | "overturned") {
    if (reviewNote.length < 10) {
      alert("Review note must be at least 10 characters");
      return;
    }

    startTransition(async () => {
      const result = await reviewAppeal(appealId, decision, reviewNote);
      if (result.error) {
        alert(result.error);
      } else {
        setExpandedId(null);
        setReviewNote("");
        fetchAppeals();
      }
    });
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl lg:text-[36px]">Appeals</h1>
      <p className="mt-2 text-base text-muted-foreground">
        {total} appeal{total !== 1 ? "s" : ""}
      </p>

      {/* Status tabs */}
      <div className="mt-6 flex flex-wrap gap-2 sm:mt-8">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleStatusChange(tab.value)}
            className={`rounded-full px-3 py-1.5 text-base font-medium uppercase transition-colors ${
              status === tab.value
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Appeals list */}
      <div className="mt-6 space-y-2">
        {appeals.length === 0 && !isPending && (
          <div className="rounded-lg border border-[var(--border)] py-12 text-center">
            <p className="text-muted-foreground">No appeals found</p>
          </div>
        )}

        {appeals.map((appeal) => (
          <div
            key={appeal.$id}
            className="rounded-lg border border-[var(--border)] transition-colors hover:bg-[rgba(255,255,255,0.02)]"
          >
            {/* Appeal card header */}
            <div className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={appeal.status} />
                  <span className="rounded-full border border-[var(--border)] bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                    {appeal.entityType}
                  </span>
                  <span className="rounded-full border border-[var(--border)] bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                    {appeal.moderationReason}
                  </span>
                </div>

                <p className="mt-2 text-sm text-foreground line-clamp-2">{appeal.reason}</p>

                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatRelativeTime(appeal.$createdAt)}
                  </span>
                  <span>User #{appeal.appealerId.slice(-6)}</span>
                </div>
              </div>

              {/* Review button — only for pending/under_review */}
              {(appeal.status === "pending" || appeal.status === "under_review") && (
                <button
                  onClick={() => {
                    setExpandedId(expandedId === appeal.$id ? null : appeal.$id);
                    setReviewNote("");
                  }}
                  className="shrink-0 rounded bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
                >
                  {expandedId === appeal.$id ? "Close" : "Review"}
                </button>
              )}

              {/* Show review note for resolved appeals */}
              {appeal.reviewNote && appeal.status !== "pending" && appeal.status !== "under_review" && (
                <button
                  onClick={() => setExpandedId(expandedId === appeal.$id ? null : appeal.$id)}
                  className="shrink-0 rounded px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Details
                </button>
              )}
            </div>

            {/* Expanded review panel */}
            {expandedId === appeal.$id && (
              <div className="border-t border-[var(--border)] p-4">
                {/* Show review note if already resolved */}
                {appeal.reviewNote && (appeal.status === "upheld" || appeal.status === "overturned") ? (
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Review Note</p>
                    <p className="mt-1 text-sm text-foreground">{appeal.reviewNote}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={3}
                      placeholder="Review note (min 10 characters)..."
                      className="w-full rounded-md border border-[var(--border)] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-coral focus:outline-none"
                      disabled={isPending}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReview(appeal.$id, "upheld")}
                        disabled={isPending || reviewNote.length < 10}
                        className="rounded bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        Uphold
                      </button>
                      <button
                        onClick={() => handleReview(appeal.$id, "overturned")}
                        disabled={isPending || reviewNote.length < 10}
                        className="rounded bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        Overturn
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => {
              setPage(page - 1);
              fetchAppeals(page - 1);
            }}
            disabled={page <= 1 || isPending}
            className="btn-ghost !py-1.5 !text-sm disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-base text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => {
              setPage(page + 1);
              fetchAppeals(page + 1);
            }}
            disabled={page >= totalPages || isPending}
            className="btn-ghost !py-1.5 !text-sm disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
