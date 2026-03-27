"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Heart, Calendar, MapPin } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toggleWishlist } from "@/actions/wishlist";
import type { EventWithVenue } from "@/actions/events";

interface EventCardProps {
  event: EventWithVenue;
  variant?: "grid" | "scroll";
  initialWishlisted?: boolean;
  convertedPrice?: string | null;
}

export function EventCard({ event, variant = "grid", initialWishlisted = false, convertedPrice }: EventCardProps) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [isPending, startTransition] = useTransition();

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await toggleWishlist(event.$id);
      if (!result.error) {
        setWishlisted(result.wishlisted);
      }
    });
  }

  return (
    <Link
      href={`/events/${event.$id}`}
      className={`group block ${variant === "scroll" ? "w-full flex-shrink-0" : ""}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
        {event.coverimageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverimageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-card">
            <span className="text-5xl opacity-10">♪</span>
          </div>
        )}

        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Top-left badges */}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {event.isFree && (
            <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-sm font-bold uppercase tracking-wide text-foreground">
              Free
            </span>
          )}
        </div>

        {/* Heart/wishlist button — top right */}
        <button
          type="button"
          onClick={handleWishlist}
          disabled={isPending}
          className={`absolute right-3 top-3 flex size-8 items-center justify-center rounded-full backdrop-blur-sm transition-all ${
            wishlisted
              ? "bg-coral/90 text-black"
              : "bg-background/80 text-muted-foreground hover:bg-background/90 hover:text-foreground"
          } ${isPending ? "animate-pulse" : ""}`}
          aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
        >
          <Heart className={`size-4 ${wishlisted ? "fill-current" : ""}`} />
        </button>

        {/* Bottom overlay info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {event.genres.length > 0 && (
            <div className="mb-1.5 flex gap-1">
              {event.genres.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm"
                >
                  {genre.length > 12 ? genre.slice(0, 10) + "…" : genre}
                </span>
              ))}
            </div>
          )}
          <h3 className="line-clamp-2 text-[15px] font-bold leading-tight text-white drop-shadow-sm">
            {event.title}
          </h3>
        </div>
      </div>

      {/* Meta below image */}
      <div className="mt-1.5 space-y-px">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3 text-coral" />
          <span className="text-[13px] font-medium text-coral">
            {formatDate(event.startsAt, { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>

        {event.venue && (
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3 text-muted-foreground" />
            <span className="truncate text-[13px] text-muted-foreground">
              {event.venue.name}
            </span>
          </div>
        )}

        <div className="pt-0.5 text-[13px] font-semibold">
          {event.isFree ? (
            <span className="text-emerald-400">Free</span>
          ) : event.minPrice && event.minPriceCurrency ? (
            <span className="text-foreground">
              From {convertedPrice ?? formatCurrency(event.minPrice, event.minPriceCurrency)}
            </span>
          ) : (
            <span className="text-muted-foreground">Price TBA</span>
          )}
        </div>
      </div>
    </Link>
  );
}
