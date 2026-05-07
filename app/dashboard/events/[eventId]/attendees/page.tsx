"use client";

import { useState, useTransition, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Download,
  Search,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Users,
  Ticket,
} from "lucide-react";
import { EmptyState } from "@/components/features/shared/EmptyState";
import {
  getEventAttendees,
  exportAttendeesCSV,
  type AttendeeRow,
} from "@/actions/attendees";
import { formatDate } from "@/lib/utils";

type FilterMode = "all" | "checked-in" | "holding";

interface AttendeesPageProps {
  params: Promise<{ eventId: string }>;
}

export default function AttendeesPage({ params }: AttendeesPageProps) {
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [isPending, startTransition] = useTransition();
  const [isExporting, startExport] = useTransition();
  const hasFetchedRef = useRef(false);
  const eventIdRef = useRef<string>("");

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      params.then(({ eventId }) => {
        eventIdRef.current = eventId;
        startTransition(async () => {
          const data = await getEventAttendees(eventId);
          setAttendees(data);
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleExport() {
    startExport(async () => {
      const csv = await exportAttendeesCSV(eventIdRef.current);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendees-${eventIdRef.current}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Counts (memoised so they don't recompute per filter change)
  const counts = useMemo(() => {
    const total = attendees.length;
    const checkedIn = attendees.filter((a) => a.checkedIn).length;
    return { total, checkedIn, holding: total - checkedIn };
  }, [attendees]);

  const filtered = useMemo(() => {
    let rows = attendees;
    if (filter === "checked-in") rows = rows.filter((a) => a.checkedIn);
    else if (filter === "holding") rows = rows.filter((a) => !a.checkedIn);

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (a) =>
          a.attendeeName.toLowerCase().includes(q) ||
          a.ticketCode.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [attendees, filter, search]);

  const checkInRate =
    counts.total > 0 ? Math.round((counts.checkedIn / counts.total) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-6xl">
      {eventIdRef.current && (
        <Link
          href={`/dashboard/events/${eventIdRef.current}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-coral"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to event
        </Link>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
            Attendees
          </p>
          <h1 className="mt-1 font-display text-2xl leading-tight sm:text-[34px]">
            Who&apos;s coming
          </h1>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting || counts.total === 0}
          className="inline-flex items-center gap-1.5 self-start rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-coral/40 hover:bg-coral/5 hover:text-coral disabled:cursor-not-allowed disabled:opacity-60 sm:self-end"
        >
          <Download className="size-3.5" aria-hidden="true" />
          {isExporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* Stat tiles */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Total tickets"
          value={counts.total}
          Icon={Ticket}
          tone="neutral"
        />
        <StatTile
          label="Checked in"
          value={counts.checkedIn}
          subtitle={counts.total > 0 ? `${checkInRate}% of total` : undefined}
          Icon={CheckCircle2}
          tone="good"
        />
        <StatTile
          label="Holding tickets"
          value={counts.holding}
          subtitle="Yet to arrive"
          Icon={Clock}
          tone="warn"
        />
      </div>

      {/* Filter pills + Search */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <FilterPill
            label="All"
            count={counts.total}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterPill
            label="Holding"
            count={counts.holding}
            active={filter === "holding"}
            onClick={() => setFilter("holding")}
            tone="amber"
          />
          <FilterPill
            label="Checked in"
            count={counts.checkedIn}
            active={filter === "checked-in"}
            onClick={() => setFilter("checked-in")}
            tone="emerald"
          />
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search name or ticket code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-border/60 bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-coral/40 focus:outline-none focus:ring-1 focus:ring-coral/20"
          />
        </div>
      </div>

      {/* List */}
      <section className="mt-6 rounded-2xl border border-border/60 bg-card">
        {isPending ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Loading attendees…
          </div>
        ) : counts.total === 0 ? (
          <EmptyState
            title="No attendees yet"
            description="Attendees will appear here when tickets are purchased."
          />
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <Users
              className="mx-auto mb-2 size-6 text-muted-foreground/40"
              aria-hidden="true"
            />
            No attendees match the current filter.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3">Attendee</th>
                    <th className="px-5 py-3">Ticket</th>
                    <th className="px-5 py-3">Tier</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr
                      key={a.ticketId}
                      className="border-b border-border/30 transition-colors last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-coral/10 text-xs font-bold text-coral ring-1 ring-coral/20">
                            {a.attendeeName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground">
                            {a.attendeeName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                        {a.ticketCode}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {a.tierName}
                      </td>
                      <td className="px-5 py-3">
                        <TicketStatusPill status={a.status} />
                      </td>
                      <td className="px-5 py-3">
                        {a.checkedIn ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300">
                            <CheckCircle2 className="size-3" aria-hidden="true" />
                            {a.checkedInAt
                              ? formatDate(a.checkedInAt, { timeStyle: "short" })
                              : "Yes"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300">
                            <Clock className="size-3" aria-hidden="true" />
                            Holding
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <ul className="divide-y divide-border/40 md:hidden">
              {filtered.map((a) => (
                <li key={a.ticketId} className="flex items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-coral/10 text-base font-bold text-coral ring-1 ring-coral/20">
                    {a.attendeeName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {a.attendeeName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="font-mono">{a.ticketCode}</span>
                      {" · "}
                      {a.tierName}
                    </p>
                  </div>
                  {a.checkedIn ? (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300"
                      title={
                        a.checkedInAt
                          ? formatDate(a.checkedInAt, { timeStyle: "short" })
                          : ""
                      }
                    >
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                      In
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300">
                      <Clock className="size-3" aria-hidden="true" />
                      Holding
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {filtered.length > 0 && counts.total > 0 && (
        <p className="mt-3 text-right text-xs text-muted-foreground">
          Showing {filtered.length} of {counts.total}
        </p>
      )}
    </div>
  );
}

// ─── Stat Tile ────────────────────────────────────────

interface StatTileProps {
  label: string;
  value: number;
  subtitle?: string;
  Icon: typeof Ticket;
  tone: "neutral" | "good" | "warn";
}

const TILE_TONE: Record<StatTileProps["tone"], string> = {
  neutral: "text-foreground",
  good: "text-emerald-700 dark:text-emerald-300",
  warn: "text-amber-700 dark:text-amber-300",
};

function StatTile({ label, value, subtitle, Icon, tone }: StatTileProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon
          className={`size-4 ${TILE_TONE[tone]}`}
          aria-hidden="true"
        />
      </div>
      <p className={`mt-2 font-display text-3xl ${TILE_TONE[tone]}`}>{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground/70">{subtitle}</p>
      )}
    </div>
  );
}

// ─── Filter Pill ──────────────────────────────────────

interface FilterPillProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tone?: "neutral" | "amber" | "emerald";
}

function FilterPill({
  label,
  count,
  active,
  onClick,
  tone = "neutral",
}: FilterPillProps) {
  const activeClass =
    tone === "amber"
      ? "bg-amber-500/15 text-amber-800 ring-amber-500/40 dark:text-amber-200"
      : tone === "emerald"
        ? "bg-emerald-500/15 text-emerald-800 ring-emerald-500/40 dark:text-emerald-200"
        : "bg-coral/15 text-coral ring-coral/40";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ring-1 transition-all ${
        active
          ? `border-transparent ${activeClass}`
          : "border-border/60 bg-card ring-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-xs ${
          active ? "bg-background/50" : "bg-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Ticket Status Pill ───────────────────────────────

function TicketStatusPill({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-blue-500/10 text-blue-700 ring-blue-500/30 dark:text-blue-300"
      : status === "void"
        ? "bg-rose-500/10 text-rose-700 ring-rose-500/30 dark:text-rose-300"
        : status === "refunded"
          ? "bg-muted text-muted-foreground ring-border"
          : "bg-muted text-muted-foreground ring-border";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ${tone}`}
    >
      {status}
    </span>
  );
}
