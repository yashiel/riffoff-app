"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, Search, Ticket, ChevronRight, LayoutGrid, List } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { EventWithVenue } from "@/actions/events";

interface EventListClientProps {
  events: EventWithVenue[];
}

const STATUS_TABS = [
  { id: "all", label: "All", color: "text-white bg-white/10" },
  { id: "published", label: "Live", color: "text-emerald-400 bg-emerald-400/10" },
  { id: "draft", label: "Drafts", color: "text-amber-400 bg-amber-400/10" },
  { id: "cancelled", label: "Cancelled", color: "text-red-400 bg-red-400/10" },
] as const;

type StatusFilter = (typeof STATUS_TABS)[number]["id"];

const statusDot: Record<string, string> = {
  published: "bg-emerald-400",
  draft: "bg-amber-400",
  cancelled: "bg-red-400",
};

export function EventListClient({ events }: EventListClientProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const counts: Record<string, number> = { all: events.length };
  for (const e of events) {
    counts[e.status] = (counts[e.status] || 0) + 1;
  }

  const filtered = events.filter((event) => {
    if (statusFilter !== "all" && event.status !== statusFilter) return false;
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

  return (
    <div>
      {/* ─── Toolbar ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {STATUS_TABS.map((tab) => {
            const count = counts[tab.id] || 0;
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all ${
                  isActive ? tab.color : "text-white/30 hover:text-white/50"
                }`}
              >
                {tab.id !== "all" && (
                  <span className={`size-1.5 rounded-full ${isActive ? statusDot[tab.id] : "bg-white/15"}`} />
                )}
                {tab.label}
                {count > 0 && (
                  <span className={`ml-0.5 text-[10px] ${isActive ? "text-inherit opacity-60" : "text-white/20"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:w-[220px] sm:flex-initial">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/20" />
            <input
              type="search"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full bg-white/[0.03] border border-white/[0.05] py-1.5 pl-8 pr-3 text-[12px] text-white placeholder:text-white/20 outline-none focus:border-white/15 transition-colors"
            />
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-white/[0.05] p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition-colors ${viewMode === "grid" ? "bg-white/10 text-white" : "text-white/25 hover:text-white/50"}`}
              aria-label="Grid view"
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md p-1.5 transition-colors ${viewMode === "list" ? "bg-white/10 text-white" : "text-white/25 hover:text-white/50"}`}
              aria-label="List view"
            >
              <List className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Results ─── */}
      <div className="mt-5">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-white/[0.03]">
              <Search className="size-5 text-white/15" />
            </div>
            <p className="text-[13px] text-white/30">
              {search ? `No events matching "${search}"` : `No ${statusFilter} events`}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          /* ─── Grid View ─── */
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((event) => (
              <Link
                key={event.$id}
                href={`/dashboard/events/${event.$id}`}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.04] transition-all hover:border-white/[0.08]"
              >
                {/* Cover image */}
                <div className="relative aspect-[16/9] overflow-hidden bg-white/[0.02]">
                  {event.coverimageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.coverimageUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl text-white/[0.04]">♪</div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-transparent to-transparent" />

                  {/* Status dot */}
                  <div className="absolute left-3 top-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm ${
                      event.status === "published" ? "text-emerald-400" :
                      event.status === "draft" ? "text-amber-400" : "text-red-400"
                    }`}>
                      <span className={`size-1.5 rounded-full ${statusDot[event.status]}`} />
                      {event.status}
                    </span>
                  </div>

                  {/* Manage arrow */}
                  <div className="absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-full bg-white/10 opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100">
                    <ChevronRight className="size-4 text-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="p-3.5">
                  <h3 className="truncate text-[14px] font-semibold leading-tight text-white/90 group-hover:text-white">
                    {event.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-white/30">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3 text-coral/50" />
                      {formatDate(event.startsAt, { dateStyle: "medium" })}
                    </span>
                    {event.venue && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">{event.venue.name}</span>
                      </span>
                    )}
                  </div>
                  {event.genres.length > 0 && (
                    <div className="mt-2 flex gap-1 overflow-hidden">
                      {event.genres.slice(0, 3).map((g) => (
                        <span key={g} className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/30">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* ─── List View ─── */
          <div className="space-y-1.5">
            {filtered.map((event) => (
              <Link
                key={event.$id}
                href={`/dashboard/events/${event.$id}`}
                className="group flex items-center gap-3.5 rounded-xl border border-white/[0.03] p-3 transition-all hover:border-white/[0.07] hover:bg-white/[0.015] sm:gap-4 sm:p-3.5"
              >
                {/* Status dot */}
                <span className={`size-2 shrink-0 rounded-full ${statusDot[event.status] ?? "bg-white/20"}`} />

                {/* Thumbnail */}
                <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-white/[0.03] sm:size-12">
                  {event.coverimageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.coverimageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-white/[0.06]">♪</div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[13px] font-semibold text-white/80 group-hover:text-white sm:text-[14px]">
                    {event.title}
                  </h3>
                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-white/25">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3 text-coral/40" />
                      {formatDate(event.startsAt, { dateStyle: "medium" })}
                    </span>
                    {event.venue && (
                      <span className="hidden items-center gap-1 sm:flex">
                        <MapPin className="size-3" />
                        {event.venue.name}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="size-4 shrink-0 text-white/10 transition-colors group-hover:text-white/30" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
