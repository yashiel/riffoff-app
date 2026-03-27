"use client";

import { useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { EventCard } from "./EventCard";
import type { EventWithVenue } from "@/actions/events";

interface EventScrollRowProps {
  events: EventWithVenue[];
  convertedPrices?: Record<string, string>;
}

/**
 * Infinite auto-scrolling event carousel using Embla Carousel.
 * GPU-accelerated transforms, smooth on mobile, pause on interaction.
 */
export function EventScrollRow({
  events,
  convertedPrices = {},
}: EventScrollRowProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      dragFree: true,
      align: "start",
      containScroll: false,
    },
    [
      AutoScroll({
        speed: 0.8,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        stopOnFocusIn: true,
      }),
    ],
  );

  const scrollPrev = useCallback(() => {
    if (!emblaApi) return;
    const autoScroll = emblaApi.plugins()?.autoScroll as ReturnType<typeof AutoScroll> | undefined;
    if (autoScroll) autoScroll.stop();
    emblaApi.scrollPrev();
    // Resume auto-scroll after a short delay
    setTimeout(() => { if (autoScroll) autoScroll.play(); }, 2000);
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (!emblaApi) return;
    const autoScroll = emblaApi.plugins()?.autoScroll as ReturnType<typeof AutoScroll> | undefined;
    if (autoScroll) autoScroll.stop();
    emblaApi.scrollNext();
    setTimeout(() => { if (autoScroll) autoScroll.play(); }, 2000);
  }, [emblaApi]);

  if (events.length === 0) return null;

  return (
    <div className="group/scroll relative">
      {/* Left arrow */}
      <button
        onClick={scrollPrev}
        className="absolute left-2 top-[35%] z-10 flex size-10 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground opacity-0 shadow-lg backdrop-blur-md transition-all hover:bg-background hover:text-foreground group-hover/scroll:opacity-100 sm:left-4"
        aria-label="Scroll left"
      >
        <ChevronLeft className="size-5" />
      </button>

      {/* Right arrow */}
      <button
        onClick={scrollNext}
        className="absolute right-2 top-[35%] z-10 flex size-10 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground opacity-0 shadow-lg backdrop-blur-md transition-all hover:bg-background hover:text-foreground group-hover/scroll:opacity-100 sm:right-4"
        aria-label="Scroll right"
      >
        <ChevronRight className="size-5" />
      </button>

      {/* Embla viewport */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-2">
          {events.map((event) => (
            <div key={event.$id} className="min-w-0 shrink-0 grow-0 basis-[220px] sm:basis-[240px]">
              <EventCard
                event={event}
                variant="scroll"
                convertedPrice={convertedPrices[event.$id] ?? null}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
