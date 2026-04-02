"use client";
export const dynamic = "force-dynamic";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { listModerationQueue, type ModerationQueueResult } from "@/actions/moderation";
import { ModerationCard } from "@/components/features/moderation/ModerationCard";
import { BulkActionBar } from "@/components/features/moderation/BulkActionBar";
import type {
  ModerationStatus,
  ModerationPriority,
  ModerationEntityType,
} from "@/lib/appwrite/types";

// ─── Constants ──────────────────────────────────────

const STATUS_TABS: Array<{ label: string; value: ModerationStatus | undefined }> = [
  { label: "All", value: undefined },
  { label: "Open", value: "open" },
  { label: "In Review", value: "in_review" },
  { label: "Actioned", value: "actioned" },
  { label: "Dismissed", value: "dismissed" },
];

const ENTITY_TYPES: Array<{ label: string; value: ModerationEntityType | undefined }> = [
  { label: "All Types", value: undefined },
  { label: "Event", value: "event" },
  { label: "User", value: "user" },
  { label: "Message", value: "message" },
  { label: "Review", value: "review" },
];

const PRIORITY_OPTIONS: Array<{ label: string; value: ModerationPriority | undefined }> = [
  { label: "All Priorities", value: undefined },
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const PAGE_SIZE = 20;

// ─── Page ───────────────────────────────────────────

export default function ModerationPage() {
  const [data, setData] = useState<ModerationQueueResult>({ items: [], total: 0 });
  const [status, setStatus] = useState<ModerationStatus | undefined>(undefined);
  const [entityType, setEntityType] = useState<ModerationEntityType | undefined>(undefined);
  const [priority, setPriority] = useState<ModerationPriority | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const hasFetchedRef = useRef(false);

  const fetchQueue = useCallback(
    (p = page, s = status, pr = priority, et = entityType) => {
      startTransition(async () => {
        const result = await listModerationQueue(s, pr, et, p, PAGE_SIZE);
        setData(result);
      });
    },
    [page, status, priority, entityType],
  );

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchQueue(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStatusChange(s: ModerationStatus | undefined) {
    setStatus(s);
    setPage(1);
    setSelectedIds([]);
    fetchQueue(1, s, priority, entityType);
  }

  function handleEntityTypeChange(et: ModerationEntityType | undefined) {
    setEntityType(et);
    setPage(1);
    setSelectedIds([]);
    fetchQueue(1, status, priority, et);
  }

  function handlePriorityChange(pr: ModerationPriority | undefined) {
    setPriority(pr);
    setPage(1);
    setSelectedIds([]);
    fetchQueue(1, status, pr, entityType);
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleBulkComplete() {
    setSelectedIds([]);
    fetchQueue();
  }

  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl lg:text-[32px]">
            Moderation Queue
          </h1>
          <p className="mt-1.5 text-base text-muted-foreground">
            Review and action reported content
          </p>
        </div>
        {data.total > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-coral" />
            </span>
            <span className="text-base font-semibold text-foreground">{data.total}</span>
            <span className="text-base text-muted-foreground">
              item{data.total !== 1 ? "s" : ""} in queue
            </span>
          </div>
        )}
      </div>

      {/* Status tabs */}
      <div className="mt-6 flex flex-wrap gap-1.5 sm:mt-8">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleStatusChange(tab.value)}
            className={`rounded-full border px-4 py-2 text-base font-medium transition-all ${
              status === tab.value
                ? "border-coral/30 bg-coral/10 text-coral"
                : "border-transparent text-muted-foreground hover:border-border/60 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter row */}
      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={entityType ?? ""}
          onChange={(e) =>
            handleEntityTypeChange(
              (e.target.value || undefined) as ModerationEntityType | undefined,
            )
          }
          className="rounded-lg border border-border/60 bg-background px-3 py-2 text-base text-foreground transition-colors focus:border-coral focus:outline-none"
        >
          {ENTITY_TYPES.map((opt) => (
            <option key={opt.label} value={opt.value ?? ""}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={priority ?? ""}
          onChange={(e) =>
            handlePriorityChange(
              (e.target.value || undefined) as ModerationPriority | undefined,
            )
          }
          className="rounded-lg border border-border/60 bg-background px-3 py-2 text-base text-foreground transition-colors focus:border-coral focus:outline-none"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value ?? ""}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Queue list */}
      <div className="mt-6 space-y-2">
        {isPending && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[68px] animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        )}

        {!isPending && data.items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted/60 text-2xl">
              🛡️
            </div>
            <p className="mt-4 text-base font-semibold text-foreground">Queue is clear</p>
            <p className="mt-1 text-base text-muted-foreground">
              No items match your current filters
            </p>
          </div>
        )}

        {!isPending &&
          data.items.map((item) => (
            <ModerationCard
              key={item.$id}
              item={item}
              selected={selectedIds.includes(item.$id)}
              onSelect={toggleSelection}
            />
          ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              setPage(page - 1);
              fetchQueue(page - 1);
            }}
            disabled={page <= 1 || isPending}
            className="rounded-lg border border-border/60 px-4 py-2 text-base font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-base text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => {
              setPage(page + 1);
              fetchQueue(page + 1);
            }}
            disabled={page >= totalPages || isPending}
            className="rounded-lg border border-border/60 px-4 py-2 text-base font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        onClear={() => setSelectedIds([])}
        onComplete={handleBulkComplete}
      />
    </div>
  );
}
