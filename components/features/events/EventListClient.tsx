"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar, MapPin, Search, ChevronRight, LayoutGrid, List,
  ArrowUpDown, Clock, TrendingUp, Eye, EyeOff, Filter, Zap, Users,
  BarChart3,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { EventWithVenue } from "@/actions/events";

interface EventListClientProps {
  events: EventWithVenue[];
}

/* ─── Filter configs ─── */
const STATUS_TABS = [
  { id: "all", label: "All", icon: Zap },
  { id: "published", label: "Live", icon: Eye },
  { id: "completed", label: "Completed", icon: Clock },
  { id: "draft", label: "Drafts", icon: EyeOff },
  { id: "cancelled", label: "Cancelled", icon: null },
] as const;

const DATE_FILTERS = [
  { id: "all", label: "All Dates" },
  { id: "today", label: "Today" },
  { id: "this-week", label: "This Week" },
  { id: "this-month", label: "This Month" },
  { id: "upcoming", label: "Coming Soon" },
  { id: "past", label: "Past Events" },
] as const;

const SORT_OPTIONS = [
  { id: "date-asc", label: "Date ↑ (soonest)" },
  { id: "date-desc", label: "Date ↓ (latest)" },
  { id: "name-asc", label: "Name A-Z" },
  { id: "name-desc", label: "Name Z-A" },
  { id: "status", label: "Status" },
] as const;

type StatusFilter = (typeof STATUS_TABS)[number]["id"];
type DateFilter = (typeof DATE_FILTERS)[number]["id"];
type SortOption = (typeof SORT_OPTIONS)[number]["id"];

const statusConfig: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  published: { dot: "bg-emerald-400", bg: "bg-emerald-400/8", text: "text-emerald-400", label: "Live" },
  completed: { dot: "bg-blue-400", bg: "bg-blue-400/15", text: "text-blue-400", label: "Completed" },
  draft: { dot: "bg-amber-400", bg: "bg-amber-400/8", text: "text-amber-400", label: "Draft" },
  cancelled: { dot: "bg-red-400/60", bg: "bg-red-400/8", text: "text-red-400/60", label: "Cancelled" },
};

/** Derive display status — published events past their end date show as "completed" */
function getDisplayStatus(event: EventWithVenue): string {
  if (event.status === "published" && new Date(event.endsAt) < new Date()) {
    return "completed";
  }
  return event.status;
}

/* ─── Date filter logic ─── */
function matchesDateFilter(date: string, filter: DateFilter): boolean {
  if (filter === "all") return true;
  const eventDate = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case "today": {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return eventDate >= today && eventDate < tomorrow;
    }
    case "this-week": {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return eventDate >= today && eventDate < weekEnd;
    }
    case "this-month": {
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      return eventDate >= today && eventDate <= monthEnd;
    }
    case "upcoming":
      return eventDate > now;
    case "past":
      return eventDate < now;
    default:
      return true;
  }
}

/* ─── Sort logic ─── */
function sortEvents(events: EventWithVenue[], sort: SortOption): EventWithVenue[] {
  return [...events].sort((a, b) => {
    switch (sort) {
      case "date-asc": return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      case "date-desc": return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
      case "name-asc": return a.title.localeCompare(b.title);
      case "name-desc": return b.title.localeCompare(a.title);
      case "status": return a.status.localeCompare(b.status);
      default: return 0;
    }
  });
}

/* ─── Relative time ─── */
function relativeTime(date: string): string {
  const diff = new Date(date).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days < 7) return `In ${days}d`;
  if (days < 30) return `In ${Math.ceil(days / 7)}w`;
  return `In ${Math.ceil(days / 30)}mo`;
}

export function EventListClient({ events }: EventListClientProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date-asc");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  /* ─── Compute stats using display status ─── */
  const stats = useMemo(() => {
    const now = new Date();
    const live = events.filter((e) => e.status === "published" && new Date(e.endsAt) >= now).length;
    const upcoming = events.filter((e) => e.status === "published" && new Date(e.startsAt) > now).length;
    const past = events.filter((e) => e.status === "published" && new Date(e.endsAt) < now).length;
    return { total: events.length, live, upcoming, past };
  }, [events]);

  /* ─── Counts per display status ─── */
  const counts: Record<string, number> = { all: events.length };
  for (const e of events) {
    const ds = getDisplayStatus(e);
    counts[ds] = (counts[ds] || 0) + 1;
  }

  /* ─── Filter + Sort ─── */
  const filtered = useMemo(() => {
    const result = events.filter((event) => {
      if (statusFilter !== "all" && getDisplayStatus(event) !== statusFilter) return false;
      if (!matchesDateFilter(event.startsAt, dateFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          event.title.toLowerCase().includes(q) ||
          event.venue?.name.toLowerCase().includes(q) ||
          event.genres.some((g) => g.toLowerCase().includes(q))
        );
      }
      return true;
    });
    return sortEvents(result, sortBy);
  }, [events, statusFilter, dateFilter, search, sortBy]);

  return (
    <div className="space-y-5">
      {/* ─── Stats strip ─── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Events", value: stats.total, icon: BarChart3, accent: "text-muted-foreground" },
          { label: "Live Now", value: stats.live, icon: Zap, accent: "text-emerald-400" },
          { label: "Upcoming", value: stats.upcoming, icon: Clock, accent: "text-coral" },
          { label: "Past", value: stats.past, icon: TrendingUp, accent: "text-muted-foreground" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-muted/60 p-5">
            <stat.icon className={`size-5 ${stat.accent}`} />
            <p className="mt-3 font-display text-3xl leading-none tracking-tight">{stat.value}</p>
            <p className="mt-1 text-sm uppercase tracking-wider text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Toolbar ─── */}
      <div className="space-y-3">
        {/* Row 1: Status + Search + View toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status pills */}
          <div className="flex gap-1 overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const count = counts[tab.id] || 0;
              const isActive = statusFilter === tab.id;
              const cfg = statusConfig[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold uppercase tracking-wide transition-all ${
                    isActive
                      ? tab.id === "all"
                        ? "bg-muted text-foreground"
                        : `${cfg?.bg} ${cfg?.text}`
                      : "text-muted-foreground/70 hover:text-muted-foreground"
                  }`}
                >
                  {tab.icon && <tab.icon className="size-3" />}
                  {cfg?.dot && isActive && <span className={`size-1.5 rounded-full ${cfg.dot}`} />}
                  {tab.label}
                  <span className={`text-[10px] ${isActive ? "opacity-50" : "opacity-30"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 sm:w-56 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="search"
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg bg-muted/80 border border-border py-2 pl-9 pr-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-coral/30 transition-colors"
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-lg border p-2 transition-all ${
                showFilters || dateFilter !== "all" || sortBy !== "date-asc"
                  ? "border-coral/20 bg-coral/5 text-coral"
                  : "border-border text-muted-foreground/70 hover:text-muted-foreground"
              }`}
              aria-label="Toggle filters"
            >
              <Filter className="size-3.5" />
            </button>

            {/* View toggle */}
            <div className="flex rounded-lg border border-border p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-md p-1.5 transition-colors ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground/70 hover:text-muted-foreground"}`}
                aria-label="Grid view"
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`rounded-md p-1.5 transition-colors ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground/70 hover:text-muted-foreground"}`}
                aria-label="List view"
              >
                <List className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Expanded filters (date + sort) */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/60 p-3 animate-fade-up">
            {/* Date filter */}
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5 text-muted-foreground/70" />
              <div className="flex flex-wrap gap-1">
                {DATE_FILTERS.map((df) => (
                  <button
                    key={df.id}
                    onClick={() => setDateFilter(df.id)}
                    className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
                      dateFilter === df.id
                        ? "bg-coral/10 text-coral"
                        : "text-muted-foreground hover:text-muted-foreground"
                    }`}
                  >
                    {df.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden h-5 w-px bg-muted sm:block" />

            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="size-3.5 text-muted-foreground/70" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-md bg-transparent px-2 py-1 text-sm text-muted-foreground outline-none"
              >
                {SORT_OPTIONS.map((so) => (
                  <option key={so.id} value={so.id} className="bg-background">{so.label}</option>
                ))}
              </select>
            </div>

            {/* Active filter count + clear */}
            {(dateFilter !== "all" || sortBy !== "date-asc") && (
              <button
                onClick={() => { setDateFilter("all"); setSortBy("date-asc"); }}
                className="ml-auto text-sm text-muted-foreground hover:text-coral transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Result count ─── */}
      <p className="text-sm uppercase tracking-wider text-muted-foreground/60">
        {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        {statusFilter !== "all" && ` · ${statusConfig[statusFilter]?.label}`}
        {dateFilter !== "all" && ` · ${DATE_FILTERS.find((d) => d.id === dateFilter)?.label}`}
      </p>

      {/* ─── Results ─── */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/70 ring-1 ring-white/[0.04]">
            <Search className="size-6 text-muted-foreground/50" />
          </div>
          <p className="text-base font-medium text-muted-foreground">No events found</p>
          <p className="mt-1 text-base text-muted-foreground/60">
            {search ? `Nothing matching "${search}"` : "Try adjusting your filters"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* ─── Grid View ─── */
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((event, i) => {
            const displayStatus = getDisplayStatus(event);
            const cfg = statusConfig[displayStatus] ?? statusConfig.draft;
            const isUpcoming = new Date(event.startsAt) > new Date();
            const isPast = new Date(event.startsAt) < new Date();

            return (
              <Link
                key={event.$id}
                href={`/dashboard/events/${event.$id}`}
                className="group relative overflow-hidden rounded-2xl border border-border transition-all duration-300 hover:border-border hover:shadow-[0_0_30px_rgba(191,255,0,0.03)]"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Cover */}
                <div className={`relative aspect-[16/10] overflow-hidden ${isPast ? "grayscale-[40%]" : ""}`}>
                  {event.coverimageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.coverimageUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-white/[0.02] to-transparent text-3xl text-white/[0.03]">♪</div>
                  )}
                  {/* Gradient — always dark overlay for image readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                  {/* Top row: status + relative time */}
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 text-sm font-bold uppercase tracking-wider backdrop-blur-md ${cfg.text}`}>
                      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                    <span className={`rounded-lg bg-black/60 px-2.5 py-1 text-sm font-semibold backdrop-blur-md ${
                      isUpcoming ? "text-coral" : "text-white/60"
                    }`}>
                      {relativeTime(event.startsAt)}
                    </span>
                  </div>

                  {/* Hover arrow */}
                  <div className="absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-full bg-coral/80 text-[#0e0e10] opacity-0 shadow-lg shadow-coral/20 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2">
                    <ChevronRight className="size-4" />
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-3 p-5">
                  <h3 className="text-base font-bold leading-snug text-foreground group-hover:text-coral transition-colors line-clamp-2">
                    {event.title}
                  </h3>
                  <div className="flex flex-col gap-1.5 text-base text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Calendar className="size-3.5 text-coral/50" />
                      {formatDate(event.startsAt, { dateStyle: "long" })}
                    </span>
                    {event.venue && (
                      <span className="flex items-center gap-2 truncate">
                        <MapPin className="size-3.5 shrink-0 text-muted-foreground/60" />
                        <span className="truncate">{event.venue.name}</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom row: genres + capacity */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-1.5 overflow-hidden">
                      {event.genres.slice(0, 2).map((g) => (
                        <span key={g} className="rounded-md bg-violet-500/10 px-2.5 py-1 text-sm font-medium uppercase tracking-wide text-violet-500 dark:text-violet-300">
                          {g}
                        </span>
                      ))}
                    </div>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground/60">
                      <Users className="size-3.5" />
                      {event.capacity.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* ─── List View ─── */
        <div className="overflow-hidden rounded-2xl border border-border">
          {/* Table header */}
          <div className="hidden border-b border-border bg-muted/60 px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground/70 sm:grid sm:grid-cols-[auto_1fr_140px_120px_80px_40px]">
            <span className="w-14" />
            <span>Event</span>
            <span>Date</span>
            <span>Venue</span>
            <span>Status</span>
            <span />
          </div>

          <div className="divide-y divide-white/[0.02]">
            {filtered.map((event) => {
              const displayStatus = getDisplayStatus(event);
            const cfg = statusConfig[displayStatus] ?? statusConfig.draft;
              const isUpcoming = new Date(event.startsAt) > new Date();
              const isPast = new Date(event.startsAt) < new Date();

              return (
                <Link
                  key={event.$id}
                  href={`/dashboard/events/${event.$id}`}
                  className="group flex items-center gap-3 px-4 py-3 transition-all hover:bg-muted/70 sm:grid sm:grid-cols-[auto_1fr_140px_120px_80px_40px]"
                >
                  {/* Thumbnail */}
                  <div className={`size-10 shrink-0 overflow-hidden rounded-lg bg-muted/80 ${isPast ? "grayscale-[30%]" : ""}`}>
                    {event.coverimageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.coverimageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-base text-white/[0.05]">♪</div>
                    )}
                  </div>

                  {/* Title + genres */}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-foreground group-hover:text-coral transition-colors">
                      {event.title}
                    </h3>
                    <div className="mt-0.5 flex gap-1 sm:hidden">
                      <span className="text-sm text-muted-foreground/70">
                        {formatDate(event.startsAt, { dateStyle: "medium" })}
                      </span>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="hidden sm:block">
                    <p className="text-base text-muted-foreground">{formatDate(event.startsAt, { dateStyle: "medium" })}</p>
                    <p className={`text-sm ${isUpcoming ? "text-coral/50" : "text-muted-foreground/60"}`}>
                      {relativeTime(event.startsAt)}
                    </p>
                  </div>

                  {/* Venue */}
                  <p className="hidden truncate text-base text-muted-foreground sm:block">
                    {event.venue?.name ?? "—"}
                  </p>

                  {/* Status */}
                  <div className="hidden sm:block">
                    <span className={`inline-flex items-center gap-1.5 rounded-md ${cfg.bg} px-2 py-0.5 text-sm font-bold uppercase tracking-wider ${cfg.text}`}>
                      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-coral/50" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
