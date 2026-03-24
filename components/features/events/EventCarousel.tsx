"use client";

import { useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "./EventCard";
import type { EventWithVenue } from "@/actions/events";

interface EventCarouselProps {
  events: EventWithVenue[];
  title?: string;
  subtitle?: string;
}

export function EventCarousel({ events, title, subtitle }: EventCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  function scroll(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 280;
    const distance = direction === "left" ? -cardWidth : cardWidth;
    el.scrollBy({ left: distance, behavior: "smooth" });
    // Recheck after animation
    setTimeout(checkScroll, 350);
  }

  if (events.length === 0) return null;

  return (
    <div className="relative">
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-4 flex items-end justify-between">
          <div>
            {title && <h2 className="font-display text-[20px]">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[12px] text-foreground/30">{subtitle}</p>}
          </div>
          {/* Arrow controls */}
          <div className="flex gap-1.5">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="flex size-8 items-center justify-center rounded-lg border border-foreground/[0.08] bg-foreground/[0.03] text-foreground/40 transition-all hover:bg-foreground/[0.06] hover:text-foreground/80 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-foreground/40"
              aria-label="Scroll left"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="flex size-8 items-center justify-center rounded-lg border border-foreground/[0.08] bg-foreground/[0.03] text-foreground/40 transition-all hover:bg-foreground/[0.06] hover:text-foreground/80 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-foreground/40"
              aria-label="Scroll right"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Scrollable track */}
      <div className="relative -mx-1">
        {/* Left fade */}
        {canScrollLeft && (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto px-1 pb-2 scrollbar-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {events.map((event) => (
            <div key={event.$id} className="w-[70vw] max-w-[260px] shrink-0 sm:w-[260px]">
              <EventCard event={event} variant="scroll" />
            </div>
          ))}
        </div>

        {/* Right fade */}
        {canScrollRight && (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />
        )}
      </div>
    </div>
  );
}
