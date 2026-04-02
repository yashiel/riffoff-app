"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  X,
  Calendar,
  Clock,
  Ticket,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { TicketCard } from "./TicketCard";
import { EmptyState } from "@/components/features/shared/EmptyState";
import { cn } from "@/lib/utils";
import type { TicketWithDetails } from "@/actions/tickets";

type TimeFilter = "all" | "upcoming" | "past";
type StatusFilter = "all" | "active" | "checked-in" | "refunded";

const TIME_TABS = [
  { id: "all" as const, label: "All" },
  { id: "upcoming" as const, label: "Upcoming", icon: Calendar },
  { id: "past" as const, label: "Past", icon: Clock },
];

const STATUS_CHIPS = [
  { id: "active" as const, label: "Active", icon: Ticket },
  { id: "checked-in" as const, label: "Checked In", icon: CheckCircle2 },
  { id: "refunded" as const, label: "Refunded", icon: RotateCcw },
];

interface TicketSearchFilterProps {
  tickets: TicketWithDetails[];
}

export function TicketSearchFilter({ tickets }: TicketSearchFilterProps) {
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const now = useMemo(() => new Date(), []);

  /* ─── Compute counts ─── */
  const counts = useMemo(() => {
    const upcoming = tickets.filter(
      (t) => t.event && new Date(t.event.endsAt) >= now,
    );
    const past = tickets.filter(
      (t) => !t.event || new Date(t.event.endsAt) < now,
    );
    return {
      all: tickets.length,
      upcoming: upcoming.length,
      past: past.length,
      active: tickets.filter((t) => t.status === "active" && !t.checkedInAt)
        .length,
      "checked-in": tickets.filter((t) => !!t.checkedInAt).length,
      refunded: tickets.filter((t) => t.status === "refunded").length,
    };
  }, [tickets, now]);

  /* ─── Filter logic ─── */
  const filtered = useMemo(() => {
    let result = tickets;

    if (timeFilter === "upcoming") {
      result = result.filter((t) => t.event && new Date(t.event.endsAt) >= now);
    } else if (timeFilter === "past") {
      result = result.filter(
        (t) => !t.event || new Date(t.event.endsAt) < now,
      );
    }

    if (statusFilter === "active") {
      result = result.filter((t) => t.status === "active" && !t.checkedInAt);
    } else if (statusFilter === "checked-in") {
      result = result.filter((t) => !!t.checkedInAt);
    } else if (statusFilter === "refunded") {
      result = result.filter((t) => t.status === "refunded");
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter((t) => {
        const title = t.event?.title?.toLowerCase() ?? "";
        const venue = t.venue?.name?.toLowerCase() ?? "";
        const tier = t.tier?.name?.toLowerCase() ?? "";
        const code = t.ticketCode?.toLowerCase() ?? "";
        return (
          title.includes(q) ||
          venue.includes(q) ||
          tier.includes(q) ||
          code.includes(q)
        );
      });
    }

    return result;
  }, [tickets, query, timeFilter, statusFilter, now]);

  const clearAll = useCallback(() => {
    setQuery("");
    setTimeFilter("all");
    setStatusFilter("all");
  }, []);

  const hasActiveFilters =
    query.trim() !== "" || timeFilter !== "all" || statusFilter !== "all";

  const upcoming = filtered.filter(
    (t) => t.event && new Date(t.event.endsAt) >= now,
  );
  const past = filtered.filter(
    (t) => !t.event || new Date(t.event.endsAt) < now,
  );

  /* ─── Empty state — no tickets at all ─── */
  if (tickets.length === 0) {
    return (
      <EmptyState
        title="No tickets yet"
        description="Browse events and purchase tickets to see them here."
        actionLabel="Browse Events"
        actionHref="/events"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Stats summary ─── */}
      <div className="flex items-stretch divide-x divide-border/50 rounded-xl border border-border/50 bg-muted/20 px-1">
        <StatCell
          value={counts.all}
          label="Tickets"
          highlight={false}
        />
        <StatCell
          value={counts.upcoming}
          label="Upcoming"
          highlight={counts.upcoming > 0}
        />
        <StatCell
          value={counts["checked-in"]}
          label="Attended"
          highlight={false}
        />
      </div>

      {/* ─── Toolbar ─── */}
      <div className="space-y-3">
        {/* Row 1: Segmented time control + search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Segmented control */}
          <div className="inline-flex rounded-xl bg-muted/50 p-1 ring-1 ring-border/40">
            {TIME_TABS.map((tab) => {
              const isSelected = timeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTimeFilter(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all",
                    isSelected
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      isSelected ? "text-coral" : "text-muted-foreground/40",
                    )}
                  >
                    {counts[tab.id]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search input */}
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <input
              type="search"
              placeholder="Search events, venues, codes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-muted/40 py-2 pl-9 pr-9 text-base text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-coral/30 focus:bg-muted/60"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Status filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_CHIPS.map((chip) => {
            const isSelected = statusFilter === chip.id;
            const count = counts[chip.id];
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatusFilter(isSelected ? "all" : chip.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-all",
                  isSelected
                    ? "border-coral/30 bg-coral/10 text-coral"
                    : "border-border/50 text-muted-foreground/70 hover:border-border hover:text-foreground",
                )}
              >
                <chip.icon className="size-3.5" />
                {chip.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      isSelected ? "text-coral/70" : "text-muted-foreground/40",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {hasActiveFilters && (
            <>
              <div className="hidden h-4 w-px bg-border/50 sm:block" />
              <button
                type="button"
                onClick={clearAll}
                className="text-sm text-muted-foreground/60 transition-colors hover:text-coral"
              >
                Clear all
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── Results ─── */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/60 ring-1 ring-border/30">
            <Search className="size-6 text-muted-foreground/40" />
          </div>
          <p className="text-base font-medium text-muted-foreground">
            No tickets found
          </p>
          <p className="mt-1 text-base text-muted-foreground/60">
            {query
              ? `Nothing matching "${query}"`
              : "Try adjusting your filters"}
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-3 text-sm text-coral transition-colors hover:text-coral/80"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming section */}
          {upcoming.length > 0 && (
            <div>
              {timeFilter !== "past" && past.length > 0 && (
                <SectionLabel count={upcoming.length}>Upcoming</SectionLabel>
              )}
              <div className={cn("space-y-3", timeFilter !== "past" && past.length > 0 && "mt-4")}>
                {upcoming.map((ticket, index) => (
                  <TicketCard
                    key={ticket.$id}
                    ticket={ticket}
                    upNext={index === 0 && timeFilter !== "past" && !hasActiveFilters}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past section */}
          {past.length > 0 && (
            <div>
              {timeFilter !== "upcoming" && upcoming.length > 0 && (
                <SectionLabel count={past.length} muted>
                  Past Events
                </SectionLabel>
              )}
              <div
                className={cn(
                  "space-y-3 opacity-60",
                  timeFilter !== "upcoming" && upcoming.length > 0 && "mt-4",
                )}
              >
                {past.map((ticket) => (
                  <TicketCard key={ticket.$id} ticket={ticket} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function StatCell({
  value,
  label,
  highlight,
}: {
  value: number;
  label: string;
  highlight: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center py-3">
      <span
        className={cn(
          "font-display text-2xl font-bold tabular-nums leading-none",
          highlight ? "text-coral" : "text-foreground",
        )}
      >
        {value}
      </span>
      <span className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
        {label}
      </span>
    </div>
  );
}

function SectionLabel({
  children,
  count,
  muted = false,
}: {
  children: React.ReactNode;
  count: number;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <h2
        className={cn(
          "font-display text-lg font-bold tracking-tight",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {children}
      </h2>
      <span className="rounded-full bg-muted/60 px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground/60">
        {count}
      </span>
      <div className="h-px flex-1 bg-border/40" />
    </div>
  );
}
