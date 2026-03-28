"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Heart,
  ArrowRight,
  Users,
  Sparkles,
  Ticket,
} from "lucide-react";
import { EmptyState } from "@/components/features/shared/EmptyState";
import { toggleWishlist } from "@/actions/wishlist";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { EventWithVenue } from "@/actions/events";

interface EventGridProps {
  events: EventWithVenue[];
  wishlistedIds?: string[];
  convertedPrices?: Record<string, string>;
}

export function EventGrid({
  events,
  wishlistedIds = [],
  convertedPrices = {},
}: EventGridProps) {
  const wishlistSet = new Set(wishlistedIds);

  if (events.length === 0) {
    return (
      <EmptyState
        title="No events found"
        description="Try adjusting your filters or check back later for new events."
      />
    );
  }

  // Layout: 1 hero + 2 side cards + rest in 3-col grid
  const [hero, ...rest] = events;
  const sidePair = rest.slice(0, 2);
  const gridEvents = rest.slice(2);

  return (
    <div className="space-y-6">
      {/* ═══ Row 1: Bento — hero left (2/3) + 2 stacked right (1/3) ═══ */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr] lg:grid-rows-2">
        {/* Hero — spans 2 rows */}
        <div className="lg:row-span-2">
          <HeroCard
            event={hero}
            initialWishlisted={wishlistSet.has(hero.$id)}
            convertedPrice={convertedPrices[hero.$id] ?? null}
          />
        </div>

        {/* Side cards — one per row */}
        {sidePair.map((event) => (
          <SideCard
            key={event.$id}
            event={event}
            initialWishlisted={wishlistSet.has(event.$id)}
            convertedPrice={convertedPrices[event.$id] ?? null}
          />
        ))}
      </div>

      {/* ═══ Row 2+: Standard 3-column grid ═══ */}
      {gridEvents.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gridEvents.map((event) => (
            <GridCard
              key={event.$id}
              event={event}
              initialWishlisted={wishlistSet.has(event.$id)}
              convertedPrice={convertedPrices[event.$id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   WishlistButton
   ───────────────────────────────────────────────── */
function WishlistButton({
  eventId,
  initialWishlisted,
  className,
}: {
  eventId: string;
  initialWishlisted: boolean;
  className?: string;
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await toggleWishlist(eventId);
      if (!result.error) setWishlisted(result.wishlisted);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`flex size-9 items-center justify-center rounded-full backdrop-blur-md transition-all ${
        wishlisted
          ? "bg-coral/20 text-coral"
          : "bg-black/30 text-white/50 hover:bg-black/50 hover:text-white"
      } ${isPending ? "animate-pulse" : ""} ${className ?? ""}`}
      aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
    >
      <Heart className={`size-4 ${wishlisted ? "fill-current" : ""}`} />
    </button>
  );
}

/* ─────────────────────────────────────────────────
   HeroCard — large 2/3 width, spans 2 rows
   ───────────────────────────────────────────────── */
function HeroCard({
  event,
  initialWishlisted,
  convertedPrice,
}: {
  event: EventWithVenue;
  initialWishlisted: boolean;
  convertedPrice: string | null;
}) {
  const isFree = event.isFree;
  const hasPrice = !isFree && event.minPrice && event.minPrice > 0;

  return (
    <Link
      href={`/events/${event.$id}`}
      className="group relative block h-full overflow-hidden rounded-2xl"
    >
      <div className="relative h-full min-h-[320px] sm:min-h-[400px] lg:min-h-0">
        {event.coverimageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverimageUrl}
            alt={event.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
          <span className="flex items-center gap-1.5 rounded-full bg-coral px-3 py-1 text-sm font-bold uppercase tracking-wider text-white dark:text-[#08080a]">
            <Sparkles className="size-3" aria-hidden="true" />
            Featured
          </span>
          <WishlistButton
            eventId={event.$id}
            initialWishlisted={initialWishlisted}
          />
        </div>

        {/* Content — bottom */}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          {/* Genres */}
          <div className="flex flex-wrap gap-1.5">
            {event.genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className="rounded-full bg-white/10 px-2.5 py-0.5 text-sm font-medium uppercase tracking-wider text-white/60 backdrop-blur-sm"
              >
                {g}
              </span>
            ))}
          </div>

          <h2
            className="mt-3 font-display text-[clamp(1.5rem,3vw,2.5rem)] leading-[0.95] text-white"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
          >
            {event.title}
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-base text-white/60 [text-shadow:0_1px_4px_rgba(0,0,0,0.3)]">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3 text-coral" aria-hidden="true" />
              {formatDate(event.startsAt, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            {event.venue && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3" aria-hidden="true" />
                {event.venue.name}
              </span>
            )}
          </div>

          {/* Price + CTA */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-base font-bold text-white">
              {isFree ? (
                <span className="text-emerald-400">Free Entry</span>
              ) : hasPrice ? (
                <span>
                  From{" "}
                  {convertedPrice ??
                    formatCurrency(
                      event.minPrice!,
                      event.minPriceCurrency ?? "MYR"
                    )}
                </span>
              ) : null}
            </div>
            <span className="flex items-center gap-1 text-base font-semibold text-coral transition-transform group-hover:translate-x-0.5">
              <Ticket className="size-3.5" aria-hidden="true" />
              Get Tickets
              <ArrowRight className="size-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────
   SideCard — compact horizontal card for side column
   ───────────────────────────────────────────────── */
function SideCard({
  event,
  initialWishlisted,
  convertedPrice,
}: {
  event: EventWithVenue;
  initialWishlisted: boolean;
  convertedPrice: string | null;
}) {
  const isFree = event.isFree;
  const hasPrice = !isFree && event.minPrice && event.minPrice > 0;
  const eventDate = new Date(event.startsAt);
  const day = eventDate.getDate();
  const monthShort = eventDate
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();

  return (
    <Link
      href={`/events/${event.$id}`}
      className="event-card group flex overflow-hidden rounded-2xl border border-border bg-card"
    >
      {/* Image — left side */}
      <div className="relative w-[120px] shrink-0 overflow-hidden sm:w-[140px]">
        {event.coverimageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverimageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted/80 text-2xl text-muted-foreground/50">
            ♪
          </div>
        )}
        {/* Date overlay */}
        <div className="absolute bottom-2 left-2 flex flex-col items-center rounded-lg bg-background/80 px-2 py-1 backdrop-blur-sm">
          <span className="text-xs font-bold leading-none text-coral">
            {monthShort}
          </span>
          <span className="text-base font-bold leading-tight text-foreground">
            {day}
          </span>
        </div>
      </div>

      {/* Content — right side */}
      <div className="flex min-w-0 flex-1 flex-col justify-between p-3.5">
        <div>
          <h3 className="line-clamp-2 text-base font-bold leading-tight text-foreground transition-colors group-hover:text-coral">
            {event.title}
          </h3>
          <p className="mt-1.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            {event.venue?.name ?? "TBA"}
          </p>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-base font-semibold tabular-nums">
            {isFree ? (
              <span className="text-emerald-400">Free</span>
            ) : hasPrice ? (
              <span>
                {convertedPrice ??
                  formatCurrency(
                    event.minPrice!,
                    event.minPriceCurrency ?? "MYR"
                  )}
              </span>
            ) : (
              <span className="text-muted-foreground">TBA</span>
            )}
          </span>
          {event.genres[0] && (
            <span className="genre-pill !px-2 !py-0.5 !text-[8px]">
              {event.genres[0]}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────
   GridCard — standard card, 3-per-row
   ───────────────────────────────────────────────── */
function GridCard({
  event,
  initialWishlisted,
  convertedPrice,
}: {
  event: EventWithVenue;
  initialWishlisted: boolean;
  convertedPrice: string | null;
}) {
  const isFree = event.isFree;
  const hasPrice = !isFree && event.minPrice && event.minPrice > 0;
  const eventDate = new Date(event.startsAt);
  const day = eventDate.getDate();
  const monthShort = eventDate.toLocaleDateString("en-US", { month: "short" });

  return (
    <Link
      href={`/events/${event.$id}`}
      className="event-card group block overflow-hidden rounded-2xl border border-border bg-card"
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
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted/80 to-muted/50 text-3xl text-muted-foreground/50">
            ♪
          </div>
        )}

        {/* Date badge */}
        <div className="absolute left-3 top-3 flex flex-col items-center rounded-xl bg-background/80 px-2.5 py-1.5 backdrop-blur-sm">
          <span className="text-sm font-bold uppercase leading-none text-coral">
            {monthShort}
          </span>
          <span className="text-lg font-bold leading-tight text-foreground">
            {day}
          </span>
        </div>

        {/* Free badge */}
        {isFree && (
          <div className="absolute bottom-3 left-3 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-sm font-bold uppercase tracking-wide text-white">
            Free
          </div>
        )}

        {/* Heart */}
        <WishlistButton
          eventId={event.$id}
          initialWishlisted={initialWishlisted}
          className="absolute right-3 top-3"
        />

        {/* Gradient */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
      </div>

      {/* Content */}
      <div className="space-y-2 p-4 pt-3">
        <h3 className="line-clamp-2 text-base font-bold leading-tight text-foreground transition-colors group-hover:text-coral">
          {event.title}
        </h3>

        <div className="flex items-center gap-1.5 text-base text-coral/80">
          <Calendar className="size-3" aria-hidden="true" />
          {formatDate(event.startsAt, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </div>

        {event.venue && (
          <div className="flex items-center gap-1.5 text-base text-muted-foreground">
            <MapPin className="size-3" aria-hidden="true" />
            <span className="truncate">{event.venue.name}</span>
          </div>
        )}

        {/* Price + genres */}
        <div className="flex items-center justify-between border-t border-border pt-2.5">
          <div className="text-base font-semibold">
            {isFree ? (
              <span className="text-emerald-400">Free</span>
            ) : hasPrice ? (
              <span className="tabular-nums">
                From{" "}
                {convertedPrice ??
                  formatCurrency(
                    event.minPrice!,
                    event.minPriceCurrency ?? "MYR"
                  )}
              </span>
            ) : (
              <span className="text-muted-foreground">Price TBA</span>
            )}
          </div>
          <div className="flex gap-1">
            {event.genres.slice(0, 2).map((g) => (
              <span key={g} className="genre-pill !px-2 !py-0.5 !text-xs">
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
