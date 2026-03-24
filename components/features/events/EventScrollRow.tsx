"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "./EventCard";
import type { EventWithVenue } from "@/actions/events";

interface EventScrollRowProps {
  events: EventWithVenue[];
  convertedPrices?: Record<string, string>;
  /** Pixels per second for continuous scroll (default: 30) */
  scrollSpeed?: number;
}

export function EventScrollRow({
  events,
  convertedPrices = {},
  scrollSpeed = 30,
}: EventScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Duplicate events for seamless infinite loop
  const duplicatedEvents = [...events, ...events];

  // Continuous smooth scroll via requestAnimationFrame
  const animate = useCallback(
    (timestamp: number) => {
      if (!scrollRef.current) return;

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000; // seconds
      lastTimeRef.current = timestamp;

      if (!isHovered) {
        scrollRef.current.scrollLeft += scrollSpeed * delta;

        // When we've scrolled past the first set, snap back seamlessly
        const halfWidth = scrollRef.current.scrollWidth / 2;
        if (scrollRef.current.scrollLeft >= halfWidth) {
          scrollRef.current.scrollLeft -= halfWidth;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    },
    [isHovered, scrollSpeed],
  );

  useEffect(() => {
    lastTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

  function manualScroll(direction: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  }

  if (events.length === 0) return null;

  return (
    <div
      className="group/scroll relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left arrow — shows on hover */}
      <button
        onClick={() => manualScroll("left")}
        className="absolute left-2 top-[35%] z-10 flex size-10 items-center justify-center rounded-full border border-foreground/[0.06] bg-background/80 text-foreground/60 opacity-0 shadow-lg backdrop-blur-md transition-all hover:bg-background hover:text-foreground group-hover/scroll:opacity-100 sm:left-4"
        aria-label="Scroll left"
      >
        <ChevronLeft className="size-5" />
      </button>

      {/* Right arrow — shows on hover */}
      <button
        onClick={() => manualScroll("right")}
        className="absolute right-2 top-[35%] z-10 flex size-10 items-center justify-center rounded-full border border-foreground/[0.06] bg-background/80 text-foreground/60 opacity-0 shadow-lg backdrop-blur-md transition-all hover:bg-background hover:text-foreground group-hover/scroll:opacity-100 sm:right-4"
        aria-label="Scroll right"
      >
        <ChevronRight className="size-5" />
      </button>

      {/* Infinite scrolling row — no scrollbar */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-hidden"
      >
        {duplicatedEvents.map((event, i) => (
          <EventCard
            key={`${event.$id}-${i}`}
            event={event}
            variant="scroll"
            convertedPrice={convertedPrices[event.$id] ?? null}
          />
        ))}
      </div>
    </div>
  );
}
