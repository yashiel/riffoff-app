"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, X, Calendar, Clock, Ticket, CheckCircle2, RotateCcw } from "lucide-react";
import { TicketCard } from "./TicketCard";
import { EmptyState } from "@/components/features/shared/EmptyState";
import type { TicketWithDetails } from "@/actions/tickets";

type TimeFilter = "all" | "upcoming" | "past";
type StatusFilter = "all" | "active" | "checked-in" | "refunded";

const TIME_TABS = [
  { id: "all" as const, label: "All", icon: Ticket },
  { id: "upcoming" as const, label: "Upcoming", icon: Calendar },
  { id: "past" as const, label: "Past", icon: Clock },
];

const STATUS_TABS = [
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
    const upcoming = tickets.filter((t) => t.event && new Date(t.event.endsAt) >= now);
    const past = tickets.filter((t) => !t.event || new Date(t.event.endsAt) < now);
    return {
      all: tickets.length,
      upcoming: upcoming.length,
      past: past.length,
      active: tickets.filter((t) => t.status === "active" && !t.checkedInAt).length,
      "checked-in": tickets.filter((t) => !!t.checkedInAt).length,
      refunded: tickets.filter((t) => t.status === "refunded").length,
    };
  }, [tickets, now]);

  const filtered = useMemo(() => {
    let result = tickets;

    // Time filter
    if (timeFilter === "upcoming") {
      result = result.filter((t) => t.event && new Date(t.event.endsAt) >= now);
    } else if (timeFilter === "past") {
      result = result.filter((t) => !t.event || new Date(t.event.endsAt) < now);
    }

    // Status filter
    if (statusFilter === "active") {
      result = result.filter((t) => t.status === "active" && !t.checkedInAt);
    } else if (statusFilter === "checked-in") {
      result = result.filter((t) => !!t.checkedInAt);
    } else if (statusFilter === "refunded") {
      result = result.filter((t) => t.status === "refunded");
    }

    // Search — match against event title, venue, tier, ticket code
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

  // Split filtered results into upcoming / past for display
  const upcoming = filtered.filter((t) => t.event && new Date(t.event.endsAt) >= now);
  const past = filtered.filter((t) => !t.event || new Date(t.event.endsAt) < now);

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
    <div className="space-y-5">
      {/* ─── Toolbar ─── */}
      <div className="space-y-3">
        {/* Row 1: Time pills + Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Time filter pills — matches EventListClient status tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {TIME_TABS.map((tab) => {
              const isActive = timeFilter === tab.id;
              const count = counts[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTimeFilter(tab.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold uppercase tracking-wide transition-all ${
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground/70 hover:text-muted-foreground"
                  }`}
                >
                  <tab.icon className="size-3" />
                  {tab.label}
                  <span className={`text-[10px] ${isActive ? "opacity-50" : "opacity-30"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:w-64 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="search"
              placeholder="Search events, venues, codes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/80 py-2 pl-9 pr-9 text-base text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-coral/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Status filter chips — matches EventListClient expanded filter panel */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
            const count = counts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(isActive ? "all" : tab.id)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-coral/10 text-coral"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="size-3" />
                {tab.label}
                {count > 0 && (
                  <span className={`text-[10px] ${isActive ? "opacity-60" : "opacity-40"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Divider + Clear */}
          {hasActiveFilters && (
            <>
              <div className="hidden h-5 w-px bg-border sm:block" />
              <button
                type="button"
                onClick={clearAll}
                className="text-sm text-muted-foreground transition-colors hover:text-coral"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── Result count ─── */}
      {hasActiveFilters && (
        <p className="text-sm uppercase tracking-wider text-muted-foreground/60">
          {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
          {timeFilter !== "all" && ` · ${TIME_TABS.find((t) => t.id === timeFilter)?.label}`}
          {statusFilter !== "all" && ` · ${STATUS_TABS.find((t) => t.id === statusFilter)?.label}`}
        </p>
      )}

      {/* ─── Results ─── */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/70 ring-1 ring-white/[0.04]">
            <Search className="size-6 text-muted-foreground/50" />
          </div>
          <p className="text-base font-medium text-muted-foreground">
            No tickets found
          </p>
          <p className="mt-1 text-base text-muted-foreground/60">
            {query ? `Nothing matching "${query}"` : "Try adjusting your filters"}
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
          {upcoming.length > 0 && (
            <div>
              {timeFilter !== "past" && past.length > 0 && (
                <h2 className="font-display text-[20px]">Upcoming</h2>
              )}
              <div className="mt-4 space-y-3">
                {upcoming.map((ticket) => (
                  <TicketCard key={ticket.$id} ticket={ticket} />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              {timeFilter !== "upcoming" && upcoming.length > 0 && (
                <h2 className="font-display text-[20px] text-muted-foreground">
                  Past Events
                </h2>
              )}
              <div className="mt-4 space-y-3 opacity-60">
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
