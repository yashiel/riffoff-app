"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, Search } from "lucide-react";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import { formatDate } from "@/lib/utils";
import type { EventWithVenue } from "@/actions/events";

interface EventListClientProps {
  events: EventWithVenue[];
}

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Draft" },
  { id: "cancelled", label: "Cancelled" },
] as const;

type StatusFilter = (typeof STATUS_TABS)[number]["id"];

export function EventListClient({ events }: EventListClientProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  // Count per status
  const counts: Record<string, number> = { all: events.length };
  for (const e of events) {
    counts[e.status] = (counts[e.status] || 0) + 1;
  }

  // Filter
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
      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const count = counts[tab.id] || 0;
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium uppercase transition-colors ${
                  isActive
                    ? tab.id === "cancelled"
                      ? "bg-red-500/10 text-red-400"
                      : tab.id === "draft"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-coral/10 text-coral"
                    : "text-white/40 hover:bg-white/[0.03] hover:text-white/60"
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  isActive ? "bg-white/10" : "bg-white/[0.03]"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
          <input
            type="search"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-white/[0.03] border border-white/[0.06] py-2 pl-8 pr-3 text-[13px] text-white placeholder:text-white/25 outline-none focus:border-white/15 transition-colors"
          />
        </div>
      </div>

      {/* Results */}
      <div className="mt-4">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-white/30">
            {search ? `No events matching "${search}"` : `No ${statusFilter} events`}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((event) => (
              <Link
                key={event.$id}
                href={`/dashboard/events/${event.$id}`}
                className="flex items-center gap-4 rounded-xl border border-white/[0.04] p-3.5 transition-all hover:border-white/[0.08] hover:bg-white/[0.015] sm:p-4"
              >
                {/* Thumbnail */}
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-white/[0.03] sm:size-16">
                  {event.coverimageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.coverimageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-lg opacity-10">♪</div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[14px] font-semibold text-white sm:text-[15px]">{event.title}</h3>
                    <StatusBadge status={event.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[12px] text-white/35">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3 text-coral/60" />
                      {formatDate(event.startsAt, { dateStyle: "medium" })}
                    </span>
                    {event.venue && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {event.venue.name}
                      </span>
                    )}
                  </div>
                </div>

                <span className="hidden text-[12px] text-white/20 sm:block">Manage →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
