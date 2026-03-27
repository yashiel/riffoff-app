"use client";
export const dynamic = "force-dynamic";

import { useState, useTransition, useEffect, useRef, useId } from "react";
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCog,
  CalendarX,
  CalendarCheck,
  CalendarOff,
  CalendarCheck2,
  FileText,
  Star,
  XCircle,
  CheckCircle2,
  Filter,
  ArrowRight,
  Clock,
} from "lucide-react";
import { getAuditLogs, type AuditLogRow } from "@/actions/admin";
import { formatDate } from "@/lib/utils";

/* ─── Metadata type for parsed JSON ─── */
type Meta = Record<string, unknown>;
function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

/* ─── Action config: icon, color, bg, and human description builder ─── */
interface ActionDef {
  icon: typeof ScrollText;
  color: string;
  bg: string;
  describe: (meta: Meta) => string;
}

const ACTION_CONFIG: Record<string, ActionDef> = {
  "admin.role_change": {
    icon: UserCog,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    describe: (m) => {
      const actor = str(m.actorName) ?? "An admin";
      const target = str(m.targetName) ?? "a user";
      const from = str(m.previousRole);
      const to = str(m.newRole);
      if (from && to) return `${actor} changed ${target}'s role from ${from} to ${to}`;
      return `${actor} changed ${target}'s role`;
    },
  },
  "admin.event_cancelled": {
    icon: CalendarX,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    describe: (m) => {
      const actor = str(m.actorName) ?? "An admin";
      const title = str(m.title);
      return title
        ? `${actor} force-cancelled the event "${title}"`
        : `${actor} force-cancelled an event`;
    },
  },
  "event.published": {
    icon: CalendarCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    describe: (m) => {
      const title = str(m.title);
      return title ? `Event "${title}" was published and is now live` : "An event was published";
    },
  },
  "event.cancelled": {
    icon: CalendarX,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    describe: (m) => {
      const title = str(m.title);
      return title
        ? `Event "${title}" was cancelled by the organiser`
        : "An event was cancelled";
    },
  },
  "event.unpublished": {
    icon: CalendarOff,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    describe: (m) => {
      const title = str(m.title);
      return title ? `Event "${title}" was unpublished (reverted to draft)` : "An event was unpublished";
    },
  },
  "event.completed": {
    icon: CalendarCheck2,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    describe: (m) => {
      const title = str(m.title);
      return title ? `Event "${title}" was marked as completed` : "An event was completed";
    },
  },
  "application.submitted": {
    icon: FileText,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    describe: (m) => {
      const title = str(m.eventTitle);
      return title
        ? `An artist submitted a performance application for "${title}"`
        : "An artist submitted a performance application";
    },
  },
  "application.accepted": {
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    describe: (m) => {
      const title = str(m.eventTitle);
      return title
        ? `A performance application for "${title}" was accepted`
        : "A performance application was accepted";
    },
  },
  "application.rejected": {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    describe: (m) => {
      const title = str(m.eventTitle);
      return title
        ? `A performance application for "${title}" was rejected`
        : "A performance application was rejected";
    },
  },
  "application.shortlisted": {
    icon: Star,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    describe: (m) => {
      const title = str(m.eventTitle);
      return title
        ? `A performance application for "${title}" was shortlisted`
        : "A performance application was shortlisted";
    },
  },
};

const FALLBACK_DEF: ActionDef = {
  icon: ShieldCheck,
  color: "text-muted-foreground",
  bg: "bg-muted border-border",
  describe: () => "An action was performed",
};

const FILTER_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "admin", label: "Admin actions" },
  { value: "event", label: "Event actions" },
  { value: "application", label: "Application actions" },
];

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasFetchedRef = useRef(false);
  const filterId = useId();
  const liveRegionId = useId();
  const [statusMessage, setStatusMessage] = useState("");

  function fetchLogs(p = page, f = filter) {
    startTransition(async () => {
      const result = await getAuditLogs(p, f || undefined);
      setLogs(result.logs);
      setTotal(result.total);
      setStatusMessage(`Loaded ${result.logs.length} of ${result.total} entries`);
    });
  }

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchLogs(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilterChange(newFilter: string) {
    setFilter(newFilter);
    setPage(1);
    fetchLogs(1, newFilter);
  }

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-8">
      {/* Screen reader live region */}
      <div id={liveRegionId} role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-coral/10">
            <ScrollText className="size-5 text-coral" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl">Audit Log</h1>
            <p className="text-base text-muted-foreground">
              {total} recorded {total === 1 ? "action" : "actions"}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
          <label htmlFor={filterId} className="sr-only">
            Filter audit log by action type
          </label>
          <select
            id={filterId}
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value)}
            disabled={isPending}
            className="min-w-[160px] cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-base font-medium text-foreground shadow-sm outline-none transition-colors hover:bg-muted focus:border-coral/40 focus:ring-2 focus:ring-coral/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Entries */}
      <div role="log" aria-label="Audit log entries">
        {/* Empty state */}
        {logs.length === 0 && !isPending && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <ScrollText className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="mt-4 text-base font-medium text-foreground">No audit entries yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Actions like role changes and event moderation will appear here
            </p>
          </div>
        )}

        {/* Loading state */}
        {isPending && logs.length === 0 && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 rounded-xl border border-border bg-card p-5">
                <div className="size-10 shrink-0 animate-pulse rounded-xl bg-muted" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Log entries */}
        {logs.length > 0 && (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" aria-hidden="true" />

            <div className="space-y-0">
              {logs.map((log, index) => {
                const def = ACTION_CONFIG[log.action] ?? FALLBACK_DEF;
                const Icon = def.icon;

                let metadata: Meta = {};
                try {
                  if (log.metadata) metadata = JSON.parse(log.metadata);
                } catch { /* ignore */ }

                const description = def.describe(metadata);

                /* Date separator when day changes */
                const currentDate = new Date(log.createdAt).toDateString();
                const prevDate = index > 0 ? new Date(logs[index - 1].createdAt).toDateString() : null;
                const showDateHeader = index === 0 || currentDate !== prevDate;

                return (
                  <div key={log.id}>
                    {/* Date header */}
                    {showDateHeader && (
                      <div className="relative z-10 flex items-center gap-3 pb-2 pt-6 pl-[7px] first:pt-0">
                        <div className="flex size-[26px] items-center justify-center rounded-full border-2 border-coral/40 bg-background">
                          <div className="size-2 rounded-full bg-coral" />
                        </div>
                        <time
                          dateTime={log.createdAt}
                          className="text-sm font-bold uppercase tracking-wider text-coral"
                        >
                          {formatDate(log.createdAt, { dateStyle: "full" })}
                        </time>
                      </div>
                    )}

                    {/* Entry */}
                    <div className="relative flex gap-4 py-2 pl-0.5">
                      {/* Icon node */}
                      <div
                        className={`relative z-10 flex size-[38px] shrink-0 items-center justify-center rounded-xl border ${def.bg} ring-[3px] ring-background`}
                        aria-hidden="true"
                      >
                        <Icon className={`size-[18px] ${def.color}`} />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80 hover:shadow-sm">
                        {/* Action label + time */}
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                          <span className={`text-sm font-bold uppercase tracking-wide ${def.color}`}>
                            {log.action.replace(/[._]/g, " ")}
                          </span>
                          <time
                            dateTime={log.createdAt}
                            className="flex items-center gap-1 text-sm text-muted-foreground tabular-nums"
                          >
                            <Clock className="size-3" aria-hidden="true" />
                            {formatDate(log.createdAt, { timeStyle: "short" })}
                          </time>
                        </div>

                        {/* Human-readable description */}
                        <p className="mt-2 text-base leading-relaxed text-foreground">
                          {description}
                        </p>

                        {/* Detail chips */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {/* Role transition pill */}
                          {str(metadata.previousRole) && str(metadata.newRole) && (
                            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-sm">
                              <span className="font-semibold capitalize text-foreground">
                                {str(metadata.previousRole)}
                              </span>
                              <ArrowRight className="size-3 text-coral" aria-label="to" />
                              <span className="font-semibold capitalize text-coral">
                                {str(metadata.newRole)}
                              </span>
                            </div>
                          )}

                          {/* Application status transition pill */}
                          {str(metadata.previousStatus) && (
                            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-sm">
                              <span className="font-semibold capitalize text-foreground">
                                {str(metadata.previousStatus)}
                              </span>
                              <ArrowRight className="size-3 text-coral" aria-label="to" />
                              <span className="font-semibold capitalize text-coral">
                                {log.action.split(".")[1] ?? "updated"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Reason callout */}
                        {str(metadata.reason) && (
                          <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm leading-relaxed text-foreground">
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              Reason:{" "}
                            </span>
                            {str(metadata.reason)!.slice(0, 200)}
                          </div>
                        )}

                        {/* Footer: IDs */}
                        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/50 pt-2.5 text-sm text-muted-foreground">
                          <span>
                            <span className="text-muted-foreground/60">Entity </span>
                            <span className="font-mono">{log.entityType}/{log.entityId.slice(0, 8)}</span>
                          </span>
                          {str(metadata.targetUserId) && (
                            <>
                              <span className="text-border" aria-hidden="true">|</span>
                              <span>
                                <span className="text-muted-foreground/60">Target </span>
                                <span className="font-mono">{str(metadata.targetUserId)!.slice(0, 8)}</span>
                              </span>
                            </>
                          )}
                          {str(metadata.artistId) && (
                            <>
                              <span className="text-border" aria-hidden="true">|</span>
                              <span>
                                <span className="text-muted-foreground/60">Artist </span>
                                <span className="font-mono">{str(metadata.artistId)!.slice(0, 8)}</span>
                              </span>
                            </>
                          )}
                          {str(metadata.eventId) && (
                            <>
                              <span className="text-border" aria-hidden="true">|</span>
                              <span>
                                <span className="text-muted-foreground/60">Event </span>
                                <span className="font-mono">{str(metadata.eventId)!.slice(0, 8)}</span>
                              </span>
                            </>
                          )}
                          <span className="text-border" aria-hidden="true">|</span>
                          <span>
                            <span className="text-muted-foreground/60">Actor </span>
                            <span className="font-mono">{log.actorId?.slice(0, 8) ?? "system"}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Audit log pagination" className="flex items-center justify-center gap-1 pt-2">
          <button
            onClick={() => { const p = page - 1; setPage(p); fetchLogs(p); }}
            disabled={page <= 1 || isPending}
            aria-label="Go to previous page"
            className="btn-ghost !px-3 !py-2 !text-base disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="mr-1 inline size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <span className="px-4 text-base text-muted-foreground" aria-current="page">
            Page{" "}
            <span className="font-semibold text-foreground">{page}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </span>

          <button
            onClick={() => { const p = page + 1; setPage(p); fetchLogs(p); }}
            disabled={page >= totalPages || isPending}
            aria-label="Go to next page"
            className="btn-ghost !px-3 !py-2 !text-base disabled:pointer-events-none disabled:opacity-40"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="ml-1 inline size-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}
