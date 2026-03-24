import Link from "next/link";
import { Calendar, MapPin, Heart, Users } from "lucide-react";
import { EmptyState } from "@/components/features/shared/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { EventWithVenue } from "@/actions/events";

interface EventGridProps {
  events: EventWithVenue[];
  wishlistedIds?: string[];
  convertedPrices?: Record<string, string>;
}

/** Group events by date (e.g., "Mon 24 Mar 2026") */
function groupByDate(events: EventWithVenue[]): Map<string, EventWithVenue[]> {
  const groups = new Map<string, EventWithVenue[]>();
  for (const event of events) {
    const date = new Date(event.startsAt);
    const key = date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const existing = groups.get(key) ?? [];
    existing.push(event);
    groups.set(key, existing);
  }
  return groups;
}

export function EventGrid({ events, wishlistedIds = [], convertedPrices = {} }: EventGridProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No events found"
        description="Try adjusting your filters or check back later for new events."
      />
    );
  }

  const wishlistSet = new Set(wishlistedIds);
  const grouped = groupByDate(events);

  return (
    <div className="space-y-10">
      {[...grouped.entries()].map(([dateLabel, dateEvents]) => (
        <div key={dateLabel}>
          {/* Date header — Shotgun style */}
          <h2 className="font-display text-[20px] tracking-tight sm:text-[24px]">
            {dateLabel}
          </h2>
          <div className="mt-1 h-px bg-foreground/[0.06]" />

          {/* Events grid — 3 columns on desktop */}
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {dateEvents.map((event) => (
              <ShotgunEventCard
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
  );
}

/** Shotgun-style event card — image with overlay title + metadata below */
function ShotgunEventCard({
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

  return (
    <Link
      href={`/events/${event.$id}`}
      className="group block"
    >
      {/* Image with title overlay */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
        {event.coverimageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverimageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-card text-4xl text-foreground/[0.04]">♪</div>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Wishlist heart */}
        <button
          className={`absolute right-3 top-3 flex size-8 items-center justify-center rounded-full backdrop-blur-sm transition-all ${
            wishlisted
              ? "bg-[#FF2D78]/20 text-[#FF2D78]"
              : "bg-black/30 text-white/60 hover:text-white"
          }`}
          onClick={(e) => e.preventDefault()}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={`size-4 ${wishlisted ? "fill-current" : ""}`} />
        </button>

        {/* Title overlay at bottom of image */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-[15px] font-bold leading-tight text-white line-clamp-2 sm:text-[16px]">
            {event.title}
          </h3>
        </div>
      </div>

      {/* Metadata below image */}
      <div className="mt-3 space-y-1.5">
        {/* Date + time */}
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-coral">
          <Calendar className="size-3.5" />
          {formatDate(event.startsAt, { dateStyle: "medium", timeStyle: "short" })}
        </div>

        {/* Venue */}
        {event.venue && (
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <MapPin className="size-3.5" />
            <span className="truncate">{event.venue.name}</span>
          </div>
        )}

        {/* Price + genres row */}
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-semibold">
            {isFree ? (
              <span className="text-emerald-400">Free</span>
            ) : hasPrice ? (
              <span>
                From {formatCurrency(event.minPrice!, event.minPriceCurrency ?? "MYR")}
                {convertedPrice && (
                  <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                    {convertedPrice}
                  </span>
                )}
              </span>
            ) : null}
          </div>

          {/* Genre pills */}
          <div className="flex gap-1">
            {event.genres.slice(0, 2).map((g) => (
              <span key={g} className="genre-pill !px-2 !py-0.5 !text-[9px]">
                {g}
              </span>
            ))}
          </div>
        </div>

        {/* Capacity indicator */}
        <div className="flex items-center gap-1 text-[11px] text-foreground/20">
          <Users className="size-3" />
          {event.capacity.toLocaleString()} capacity
        </div>
      </div>
    </Link>
  );
}
