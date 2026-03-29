"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { FilterSidebar } from "./FilterSidebar";
import { EventGrid } from "./EventGrid";
import { Pagination } from "./Pagination";
import type { EventWithVenue } from "@/actions/events";

interface EventsContentProps {
  events: EventWithVenue[];
  genres: string[];
  cityEvents: Array<{ cityId: string; count: number }>;
  totalEvents: number;
  wishlistedIds: string[];
  convertedPrices: Record<string, string>;
  page: number;
  totalPages: number;
}

export function EventsContent({
  events,
  genres,
  cityEvents,
  totalEvents,
  wishlistedIds,
  convertedPrices,
  page,
  totalPages,
}: EventsContentProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <>
      <div className="flex min-h-[calc(100vh-64px)]">
        {/* ═══════════════════════════════════════════
            LEFT: Sticky filter sidebar (desktop)
            Glass panel — DJ booth control panel vibe
            ═══════════════════════════════════════════ */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-16 h-[calc(100vh-64px)] border-r border-white/[0.06] bg-[#08080a]/90 backdrop-blur-xl">
            <FilterSidebar
              genres={genres}
              cityEvents={cityEvents}
              totalEvents={totalEvents}
            />
          </div>
        </aside>

        {/* ═══════════════════════════════════════════
            RIGHT: Scrolling event content
            ═══════════════════════════════════════════ */}
        <main className="flex-1">
          {/* Top bar with result count + mobile filter trigger */}
          <div className="sticky top-16 z-10 border-b border-border bg-background/80 backdrop-blur-md">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{events.length}</span>{" "}
                event{events.length !== 1 ? "s" : ""}
                {events.length < totalEvents && (
                  <span className="text-muted-foreground/60"> of {totalEvents}</span>
                )}
              </p>

              {/* Mobile filter button */}
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent lg:hidden"
              >
                <SlidersHorizontal className="size-4" />
                Filters
              </button>
            </div>
          </div>

          {/* Event grid */}
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <EventGrid
              events={events}
              wishlistedIds={wishlistedIds}
              convertedPrices={convertedPrices}
            />

            {totalPages > 1 && (
              <div className="mt-12">
                <Pagination currentPage={page} totalPages={totalPages} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ═══════════════════════════════════════════
          MOBILE: Bottom sheet filter overlay
          ═══════════════════════════════════════════ */}
      {mobileFiltersOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileFiltersOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-2xl border-t border-white/10 bg-[#0c0c0e] lg:hidden animate-in slide-in-from-bottom duration-300">
            <FilterSidebar
              genres={genres}
              cityEvents={cityEvents}
              totalEvents={totalEvents}
              isMobile
              onClose={() => setMobileFiltersOpen(false)}
            />
          </div>
        </>
      )}
    </>
  );
}
