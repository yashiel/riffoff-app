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
    <div className="pb-20">
      <h1 className="font-display text-2xl sm:text-3xl lg:text-[36px]">Moderation</h1>
      <p className="mt-2 text-base text-muted-foreground">
        {data.total} item{data.total !== 1 ? "s" : ""} in queue
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

      {/* Filter row */}
      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={entityType ?? ""}
          onChange={(e) =>
            handleEntityTypeChange(
              (e.target.value || undefined) as ModerationEntityType | undefined,
            )
          }
          className="rounded-md border border-[var(--border)] bg-background px-3 py-1.5 text-sm text-foreground"
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
          className="rounded-md border border-[var(--border)] bg-background px-3 py-1.5 text-sm text-foreground"
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
        {data.items.length === 0 && !isPending && (
          <div className="rounded-lg border border-[var(--border)] py-12 text-center">
            <p className="text-muted-foreground">No moderation items found</p>
          </div>
        )}

        {data.items.map((item) => (
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
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => {
              setPage(page - 1);
              fetchQueue(page - 1);
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
              fetchQueue(page + 1);
            }}
            disabled={page >= totalPages || isPending}
            className="btn-ghost !py-1.5 !text-sm disabled:opacity-30"
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
