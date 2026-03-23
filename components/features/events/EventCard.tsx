"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Calendar, MapPin } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toggleWishlist } from "@/actions/wishlist";
import type { EventWithVenue } from "@/actions/events";

interface EventCardProps {
  event: EventWithVenue;
  variant?: "grid" | "scroll";
  initialWishlisted?: boolean;
}

export function EventCard({ event, variant = "grid", initialWishlisted = false }: EventCardProps) {
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
      className={`group block ${variant === "scroll" ? "w-[260px] flex-shrink-0" : ""}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
        {event.coverimageUrl ? (
          <Image
            src={event.coverimageUrl}
            alt={event.title}
            fill
            className="object-cover transition-all duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#1e1e22]">
            <span className="text-5xl opacity-10">♪</span>
          </div>
        )}

        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Top-left badges */}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {event.isFree && (
            <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
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
              : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white"
          } ${isPending ? "animate-pulse" : ""}`}
          aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
        >
          <Heart className={`size-4 ${wishlisted ? "fill-current" : ""}`} />
        </button>

        {/* Bottom overlay info */}
        <div className="absolute bottom-0 left-0 right-0 p-3.5">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-tight text-white drop-shadow-sm">
            {event.title}
          </h3>
        </div>
      </div>

      {/* Meta below image */}
      <div className="mt-2.5 space-y-0.5">
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

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[13px] font-semibold text-white">
            {event.isFree ? (
              <span className="text-emerald-400">Free</span>
            ) : (
              <>From {formatCurrency(0)}</>
            )}
          </span>
          {event.genres.length > 0 && (
            <div className="flex gap-1">
              {event.genres.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
