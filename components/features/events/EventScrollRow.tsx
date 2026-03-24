"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "./EventCard";
import type { EventWithVenue } from "@/actions/events";

interface EventScrollRowProps {
  events: EventWithVenue[];
  convertedPrices?: Record<string, string>;
  /** Enable infinite auto-scroll (default: true) */
  autoScroll?: boolean;
  /** Auto-scroll interval in ms (default: 4000) */
  scrollInterval?: number;
}

export function EventScrollRow({
  events,
  convertedPrices = {},
  autoScroll = true,
  scrollInterval = 4000,
}: EventScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const cardWidth = 280; // card width + gap

  const scroll = useCallback((direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -cardWidth : cardWidth,
      behavior: "smooth",
    });
  }, []);

  // Update scroll button visibility
  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [updateScrollState]);

  // Auto-scroll — pauses on hover
  useEffect(() => {
    if (!autoScroll || isHovered) return;
    const el = scrollRef.current;
    if (!el) return;

    const timer = setInterval(() => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      // If near the end, snap back to start
      if (scrollLeft >= scrollWidth - clientWidth - 20) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: cardWidth, behavior: "smooth" });
      }
    }, scrollInterval);

    return () => clearInterval(timer);
  }, [autoScroll, isHovered, scrollInterval]);

  if (events.length === 0) return null;

  return (
    <div
      className="group/scroll relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute -left-2 top-[35%] z-10 flex size-10 items-center justify-center rounded-full border border-foreground/[0.06] bg-background/80 text-foreground/60 shadow-lg backdrop-blur-md transition-all hover:bg-background hover:text-foreground sm:-left-5"
          aria-label="Scroll left"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute -right-2 top-[35%] z-10 flex size-10 items-center justify-center rounded-full border border-foreground/[0.06] bg-background/80 text-foreground/60 shadow-lg backdrop-blur-md transition-all hover:bg-background hover:text-foreground sm:-right-5"
          aria-label="Scroll right"
        >
          <ChevronRight className="size-5" />
        </button>
      )}

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {events.map((event) => (
          <EventCard key={event.$id} event={event} variant="scroll" convertedPrice={convertedPrices[event.$id] ?? null} />
        ))}
      </div>

      {/* Auto-scroll indicator — small dots */}
      {autoScroll && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className={`h-[2px] w-8 rounded-full transition-colors ${isHovered ? "bg-foreground/10" : "bg-coral/40"}`} />
          <span className="text-[10px] uppercase tracking-widest text-foreground/15">
            {isHovered ? "Paused" : "Auto-scrolling"}
          </span>
          <div className={`h-[2px] w-8 rounded-full transition-colors ${isHovered ? "bg-foreground/10" : "bg-coral/40"}`} />
        </div>
      )}
    </div>
  );
}
