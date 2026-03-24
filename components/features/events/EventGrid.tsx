"use client";

import { useRef, useState, useMemo } from "react";
import Link from "next/link";
import { Calendar, MapPin, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/features/shared/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { EventWithVenue } from "@/actions/events";

interface EventGridProps {
  events: EventWithVenue[];
  wishlistedIds?: string[];
  convertedPrices?: Record<string, string>;
}

/** Group events by month (e.g., "Mar 2026") */
function groupByMonth(events: EventWithVenue[]): Map<string, EventWithVenue[]> {
  const groups = new Map<string, EventWithVenue[]>();
  for (const event of events) {
    const date = new Date(event.startsAt);
    const key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const existing = groups.get(key) ?? [];
    existing.push(event);
    groups.set(key, existing);
  }
  return groups;
}

export function EventGrid({ events, wishlistedIds = [], convertedPrices = {} }: EventGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const wishlistSet = new Set(wishlistedIds);

  const grouped = useMemo(() => groupByMonth(events), [events]);
  const months = useMemo(() => [...grouped.keys()], [grouped]);

  if (events.length === 0) {
    return (
      <EmptyState
        title="No events found"
        description="Try adjusting your filters or check back later for new events."
      />
    );
  }

  function scrollTo(direction: "left" | "right") {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  }

  function scrollToMonth(month: string) {
    const el = document.getElementById(`month-${month.replace(/\s/g, "-")}`);
    if (el && scrollRef.current) {
      const containerLeft = scrollRef.current.getBoundingClientRect().left;
      const elLeft = el.getBoundingClientRect().left;
      scrollRef.current.scrollBy({
        left: elLeft - containerLeft - 24,
        behavior: "smooth",
      });
    }
    setActiveMonth(month);
  }

  return (
    <div>
      {/* ─── Month navigation bar ─── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => scrollTo("left")}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-foreground/[0.08] text-foreground/40 transition-all hover:border-coral/30 hover:text-coral"
          aria-label="Scroll left"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-none py-1">
          {months.map((month) => {
            const isActive = activeMonth === month || (!activeMonth && month === months[0]);
            const count = grouped.get(month)?.length ?? 0;
            return (
              <button
                key={month}
                onClick={() => scrollToMonth(month)}
                className={`group flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${
                  isActive
                    ? "bg-coral text-[#08080a] dark:text-[#08080a]"
                    : "bg-foreground/[0.04] text-foreground/50 hover:bg-foreground/[0.08] hover:text-foreground/80"
                }`}
              >
                {month}
                <span className={`text-[11px] ${isActive ? "text-[#08080a]/60 dark:text-[#08080a]/60" : "text-foreground/25"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => scrollTo("right")}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-foreground/[0.08] text-foreground/40 transition-all hover:border-coral/30 hover:text-coral"
          aria-label="Scroll right"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* ─── Horizontal timeline ─── */}
      <div
        ref={scrollRef}
        className="relative overflow-x-auto overflow-y-visible pb-6 scrollbar-none"
        onScroll={() => {
          // Update active month based on scroll position
          if (!scrollRef.current) return;
          const container = scrollRef.current;
          const containerLeft = container.getBoundingClientRect().left;
          for (const month of months) {
            const el = document.getElementById(`month-${month.replace(/\s/g, "-")}`);
            if (el) {
              const elLeft = el.getBoundingClientRect().left;
              if (elLeft >= containerLeft - 100) {
                setActiveMonth(month);
                break;
              }
            }
          }
        }}
      >
        {/* Timeline track line */}
        <div className="absolute top-[18px] left-0 right-0 h-[2px] bg-foreground/[0.06]" />

        <div className="flex gap-0">
          {[...grouped.entries()].map(([month, monthEvents]) => (
            <div
              key={month}
              id={`month-${month.replace(/\s/g, "-")}`}
              className="flex shrink-0 flex-col"
            >
              {/* Month marker on timeline */}
              <div className="relative mb-8 pl-6">
                <div className="absolute left-6 top-[14px] size-3 rounded-full bg-coral shadow-[0_0_12px_rgba(var(--coral-rgb,191,255,0),0.4)]" />
                <div className="absolute left-[22px] top-[22px] h-8 w-[2px] bg-gradient-to-b from-coral/40 to-transparent" />
                <span className="ml-6 font-display text-[16px] tracking-wider text-foreground/70">
                  {month}
                </span>
              </div>

              {/* Event cards for this month */}
              <div className="flex gap-4 px-6">
                {monthEvents.map((event) => (
                  <TimelineEventCard
                    key={event.$id}
                    event={event}
                    wishlisted={wishlistSet.has(event.$id)}
                    convertedPrice={convertedPrices[event.$id] ?? null}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Hint ─── */}
      <p className="mt-4 text-center text-[11px] text-foreground/20">
        ← Scroll to explore events across time →
      </p>
    </div>
  );
}

/** Individual event card for the timeline */
function TimelineEventCard({
  event,
  wishlisted,
  convertedPrice,
}: {
  event: EventWithVenue;
  wishlisted: boolean;
  convertedPrice: string | null;
}) {
  const isFree = event.isFree;
  const hasPrice = !isFree && event.minPrice && event.minPrice > 0;
  const eventDate = new Date(event.startsAt);
  const day = eventDate.getDate();
  const dayName = eventDate.toLocaleDateString("en-US", { weekday: "short" });

  return (
    <Link
      href={`/events/${event.$id}`}
      className="group flex w-[280px] shrink-0 flex-col overflow-hidden rounded-2xl border border-foreground/[0.04] bg-card transition-all duration-300 hover:border-coral/20 hover:shadow-[0_8px_30px_rgba(var(--coral-rgb,191,255,0),0.08)] sm:w-[300px]"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {event.coverimageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverimageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-foreground/[0.03] text-4xl text-foreground/[0.04]">♪</div>
        )}

        {/* Date badge — overlaid top-left */}
        <div className="absolute left-3 top-3 flex flex-col items-center rounded-xl bg-background/80 px-2.5 py-1.5 backdrop-blur-sm">
          <span className="text-[10px] font-bold uppercase leading-none text-coral">{dayName}</span>
          <span className="text-[20px] font-bold leading-tight text-foreground">{day}</span>
        </div>

        {/* Heart — top-right */}
        <button
          className={`absolute right-3 top-3 flex size-8 items-center justify-center rounded-full backdrop-blur-sm transition-all ${
            wishlisted
              ? "bg-coral/20 text-coral"
              : "bg-background/40 text-foreground/50 hover:text-foreground"
          }`}
          onClick={(e) => e.preventDefault()}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={`size-4 ${wishlisted ? "fill-current" : ""}`} />
        </button>

        {/* Gradient overlay bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-[14px] font-bold leading-tight text-foreground line-clamp-2 group-hover:text-coral transition-colors">
          {event.title}
        </h3>

        {/* Time + Venue */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[12px] text-coral/80">
            <Calendar className="size-3" />
            {formatDate(event.startsAt, { timeStyle: "short" })}
          </div>
          {event.venue && (
            <div className="flex items-center gap-1.5 text-[12px] text-foreground/40">
              <MapPin className="size-3" />
              <span className="truncate">{event.venue.name}</span>
            </div>
          )}
        </div>

        {/* Price + Genres */}
        <div className="mt-auto flex items-end justify-between pt-2">
          <div className="text-[13px] font-semibold">
            {isFree ? (
              <span className="text-emerald-400">Free</span>
            ) : hasPrice ? (
              <span>
                {formatCurrency(event.minPrice!, event.minPriceCurrency ?? "MYR")}
                {convertedPrice && (
                  <span className="ml-1 text-[10px] font-normal text-foreground/30">
                    {convertedPrice}
                  </span>
                )}
              </span>
            ) : null}
          </div>
          <div className="flex gap-1">
            {event.genres.slice(0, 2).map((g) => (
              <span key={g} className="genre-pill !px-2 !py-0.5 !text-[9px]">
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
