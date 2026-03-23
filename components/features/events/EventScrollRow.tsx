"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "./EventCard";
import type { EventWithVenue } from "@/actions/events";

interface EventScrollRowProps {
  events: EventWithVenue[];
}

export function EventScrollRow({ events }: EventScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(direction: "left" | "right") {
    if (!scrollRef.current) return;
    const amount = 260; // card width + gap
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  if (events.length === 0) return null;

  return (
    <div className="group/scroll relative">
      {/* Scroll buttons */}
      <button
        onClick={() => scroll("left")}
        className="absolute -left-4 top-[35%] z-10 hidden size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 group-hover/scroll:flex"
        aria-label="Scroll left"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        onClick={() => scroll("right")}
        className="absolute -right-4 top-[35%] z-10 hidden size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 group-hover/scroll:flex"
        aria-label="Scroll right"
      >
        <ChevronRight className="size-5" />
      </button>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-5 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {events.map((event) => (
          <EventCard key={event.$id} event={event} variant="scroll" />
        ))}
      </div>
    </div>
  );
}
