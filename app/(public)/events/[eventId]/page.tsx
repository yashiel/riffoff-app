import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Shield,
  Share2,
  Music,
  Ticket,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  Flag,
  Star,
} from "lucide-react";
import Link from "next/link";
import { TierList } from "@/components/features/events/TierList";
import { RSVPButton } from "@/components/features/events/RSVPButton";
import { VideoPlayer } from "@/components/features/events/VideoPlayer";
import { ReportModal } from "@/components/features/moderation/ReportModal";
import { TrustScoreBadge } from "@/components/features/trust/TrustScoreBadge";
import { VerifiedBadge } from "@/components/features/trust/VerifiedBadge";
import { RatingDisplay } from "@/components/features/ratings/RatingDisplay";
import { RatingModal } from "@/components/features/ratings/RatingModal";
import { getEventWithDetails } from "@/actions/events";
import { getUserRSVP } from "@/actions/rsvps";
import { getOrganiserTrustData } from "@/actions/trust-score";
import { getEventRatingsSummary } from "@/actions/ratings";
import { getExchangeRates, formatConvertedPrice } from "@/lib/currency";
import {
  formatDate,
  formatRelativeTime,
  formatCurrency,
  serialize,
} from "@/lib/utils";

interface EventPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: EventPageProps) {
  const { eventId } = await params;
  const data = await getEventWithDetails(eventId);
  if (!data) return { title: "Event Not Found" };
  return {
    title: data.event.title,
    description: data.event.description?.slice(0, 160),
  };
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const data = await getEventWithDetails(eventId);
  if (!data) notFound();

  const { event, venue, tiers, lineup, rsvpCount } = data;
  const userRSVP = await getUserRSVP(eventId);
  const isPast = new Date(event.endsAt) < new Date();

  // Moderation / trust data — wrapped in try/catch so they never crash the page
  let trustData: { trustScore: number; isVerified: boolean } | null = null;
  try {
    trustData = await getOrganiserTrustData(event.organiserId);
  } catch {
    // silently fail — trust badge simply won't show
  }

  let ratingsSummary: { averageRating: number; totalRatings: number } | null = null;
  if (event.status === "completed") {
    try {
      ratingsSummary = await getEventRatingsSummary(eventId);
    } catch {
      // silently fail — ratings section simply won't show
    }
  }

  const cookieStore = await cookies();
  const displayCurrency =
    cookieStore.get("riffoff-currency")?.value || "original";
  let convertedTierPrices: Record<string, string> = {};

  if (displayCurrency !== "original") {
    const rates = await getExchangeRates("USD");
    if (rates) {
      for (const tier of tiers) {
        if (tier.currency !== displayCurrency) {
          const converted = formatConvertedPrice(
            tier.price,
            tier.currency,
            displayCurrency,
            rates
          );
          if (converted) convertedTierPrices[tier.$id] = converted;
        }
      }
    }
  }

  const eventDate = new Date(event.startsAt);
  const daysUntil = Math.max(
    0,
    Math.ceil((eventDate.getTime() - Date.now()) / 86400000)
  );
  const dayNum = eventDate.getDate();
  const monthShort = eventDate
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();
  const yearFull = eventDate.getFullYear();

  const cheapestTier =
    tiers.length > 0
      ? tiers.reduce((min, t) => (t.price < min.price ? t : min), tiers[0])
      : null;

  const checkoutUrl = cheapestTier
    ? `/events/${event.$id}/checkout?tierId=${cheapestTier.$id}&qty=1&eventTitle=${encodeURIComponent(event.title)}&tierName=${encodeURIComponent(cheapestTier.name)}&price=${cheapestTier.price}&currency=${cheapestTier.currency}`
    : null;

  return (
    <article className="lg:pb-0">
      {/* ═══════════════════════════════════════════════════════
          SPLIT LAYOUT — Poster left, content right
          Desktop: side-by-side with sticky poster
          Mobile: stacked (poster on top, content below)
          ═══════════════════════════════════════════════════════ */}
      <div className="lg:grid lg:min-h-[calc(100svh-64px)] lg:grid-cols-2">
        {/* ── LEFT: Sticky poster panel ── */}
        <div className="relative lg:sticky lg:top-0 lg:h-screen lg:overflow-hidden">
          {/* Image */}
          <div className="relative aspect-[3/4] w-full overflow-hidden lg:aspect-auto lg:h-full">
            {event.coverimageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.coverimageUrl}
                alt={event.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[50vh] items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#1a1025] to-[#0d1b2a]">
                <span className="text-[120px] opacity-[0.03]">♪</span>
              </div>
            )}

            {/* Gradient overlay — bottom (mobile: for text) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10 lg:from-black/40 lg:via-transparent" />

            {/* Mobile-only: event title overlay on poster */}
            <div className="absolute inset-x-0 bottom-0 p-5 lg:hidden">
              <div className="flex flex-wrap gap-1.5">
                {event.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-sm font-medium uppercase tracking-wider text-white/70 backdrop-blur-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>
              <h1
                className="mt-3 font-display text-[clamp(1.8rem,6vw,3rem)] leading-[0.9] text-white"
                style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
              >
                {event.title}
              </h1>
            </div>

            {/* Desktop-only: subtle overlay info at bottom */}
            <div className="absolute inset-x-0 bottom-0 hidden p-6 lg:block">
              <div className="flex items-center justify-between">
                {/* Date badge */}
                <div className="flex items-center gap-3 rounded-full bg-black/40 py-2 pl-2 pr-4 backdrop-blur-md">
                  <div className="flex size-9 items-center justify-center rounded-full bg-coral text-base font-bold text-white dark:text-[#08080a]">
                    {dayNum}
                  </div>
                  <div className="text-base leading-tight text-white/80">
                    <p className="font-semibold">{monthShort} {yearFull}</p>
                    <p className="text-white/50">
                      {formatDate(event.startsAt, { timeStyle: "short" })}
                    </p>
                  </div>
                </div>

                {/* Share button */}
                <button
                  type="button"
                  className="flex size-10 items-center justify-center rounded-full bg-black/40 text-white/50 backdrop-blur-md transition-all hover:bg-black/60 hover:text-white/80"
                  aria-label="Share event"
                >
                  <Share2 className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Scrollable content panel ── */}
        <div className="relative bg-background lg:overflow-y-auto">
          <div className="px-5 py-6 sm:px-8 sm:py-8 lg:max-w-[640px] lg:py-10">
            {/* ─── Suspended Banner ─── */}
            {event.status === "suspended" && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
                <div>
                  <p className="text-base font-semibold text-destructive">
                    This event has been suspended
                  </p>
                  <p className="mt-0.5 text-sm text-destructive/80">
                    This event has been suspended by our moderation team. If you are the organiser, please check your dashboard for more details.
                  </p>
                </div>
              </div>
            )}

            {/* ─── Header ─── */}
            <header>
              {/* Genres + countdown — desktop only (mobile shows on poster) */}
              <div className="hidden flex-wrap items-center gap-2 lg:flex">
                {event.genres.map((genre) => (
                  <span key={genre} className="genre-pill">
                    {genre}
                  </span>
                ))}
                {!isPast && daysUntil > 0 && daysUntil <= 90 && (
                  <span className="rounded-full border border-coral/30 bg-coral/10 px-3 py-1 text-sm font-bold tabular-nums text-coral">
                    {daysUntil === 1 ? "Tomorrow" : `${daysUntil} days away`}
                  </span>
                )}
                {isPast && (
                  <span className="rounded-full bg-muted px-3 py-1 text-sm font-bold text-muted-foreground">
                    Past event
                  </span>
                )}
              </div>

              {/* Title — desktop */}
              <h1 className="mt-3 hidden font-display text-[clamp(2rem,4vw,3.5rem)] leading-[0.92] tracking-tight lg:block">
                {event.title}
              </h1>

              {/* Organiser info + Report button */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {trustData && (
                    <>
                      <TrustScoreBadge score={trustData.trustScore} />
                      {trustData.isVerified && <VerifiedBadge size="sm" />}
                    </>
                  )}
                </div>
                <ReportModal
                  entityType="event"
                  entityId={event.$id}
                  entityLabel={event.title}
                  trigger={
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Report this event"
                    >
                      <Flag className="size-3.5" />
                      <span className="hidden sm:inline">Report</span>
                    </button>
                  }
                />
              </div>

              {/* Quick facts strip */}
              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-border p-3.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-coral/10">
                    <Calendar className="size-4 text-coral" aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {formatDate(event.startsAt, { dateStyle: "medium" })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(event.startsAt, { timeStyle: "short" })} –{" "}
                    {formatDate(event.endsAt, { timeStyle: "short" })}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-coral/10">
                    <MapPin className="size-4 text-coral" aria-hidden="true" />
                  </div>
                  <p className="mt-2 truncate text-base font-semibold text-foreground">
                    {venue?.name ?? "TBA"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {venue?.address ?? "Location TBA"}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-coral/10">
                    <Users className="size-4 text-coral" aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-base font-semibold tabular-nums text-foreground">
                    {event.capacity.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {!isPast ? formatRelativeTime(event.startsAt) : "Ended"}
                  </p>
                </div>
              </div>
            </header>

            {/* ─── CTA Section ─── */}
            {!isPast && (
              <div className="mt-6">
                {event.isFree ? (
                  <RSVPButton
                    eventId={event.$id}
                    currentStatus={userRSVP?.status ?? null}
                    rsvpCount={rsvpCount}
                  />
                ) : cheapestTier && checkoutUrl ? (
                  <>{/* Price bar + Buy Now */}
                  <div className="flex flex-col gap-3 rounded-2xl bg-[#1a1a1e] p-4 dark:bg-[#1a1a1e] sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <p className="text-xl font-bold text-white">
                          From{" "}
                          {convertedTierPrices[cheapestTier.$id] ??
                            formatCurrency(
                              cheapestTier.price,
                              cheapestTier.currency
                            )}
                        </p>
                        {convertedTierPrices[cheapestTier.$id] && (
                          <p className="text-base text-white/40">
                            {formatCurrency(
                              cheapestTier.price,
                              cheapestTier.currency
                            )}
                          </p>
                        )}
                      </div>
                      <p className="mt-0.5 text-base text-white/50">
                        The price you see is the price you pay
                      </p>
                    </div>
                    <Link
                      href={checkoutUrl}
                      className="btn-primary shrink-0 whitespace-nowrap"
                    >
                      Buy Now
                    </Link>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                    {/* Ticket header bar */}
                    <div className="flex items-center justify-between bg-coral/10 px-5 py-3">
                      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-coral">
                        <Ticket className="size-3.5" aria-hidden="true" />
                        All tickets
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-coral/50">
                        <Shield className="size-3" aria-hidden="true" />
                        Official
                      </div>
                    </div>

                    {/* Perforated tear line */}
                    <div className="relative" aria-hidden="true">
                      <div className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background" />
                      <div className="border-t border-dashed border-border" />
                      <div className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background" />
                    </div>

                    {/* Tiers */}
                    <div className="p-5">
                      <TierList
                        tiers={serialize(tiers)}
                        isFree={event.isFree}
                        eventId={event.$id}
                        eventTitle={event.title}
                        convertedPrices={convertedTierPrices}
                      />
                    </div>
                  </div>
                  </>
                ) : null}
              </div>
            )}

            {isPast && (
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-5">
                <Clock
                  className="size-5 text-muted-foreground/50"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-base font-semibold text-muted-foreground">
                    This event has ended
                  </p>
                  <Link
                    href="/events"
                    className="mt-0.5 inline-flex items-center gap-1 text-base text-coral"
                  >
                    Browse upcoming events
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            )}

            {/* ─── Divider ─── */}
            <div className="my-7 h-px bg-border" />

            {/* ─── About ─── */}
            {event.description && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  About
                </h2>
                <div className="mt-4 whitespace-pre-wrap text-base leading-[1.8] text-muted-foreground">
                  {event.description}
                </div>
              </section>
            )}

            {/* ─── Lineup ─── */}
            {lineup.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Lineup · {lineup.length} artist{lineup.length !== 1 ? "s" : ""}
                </h2>

                <div className="mt-5 divide-y divide-border">
                  {lineup.map(({ artist }, index) => (
                    <div
                      key={artist.$id}
                      className="group flex items-center gap-4 py-4 transition-colors"
                    >
                      {/* Number */}
                      <span className="w-6 text-right text-base font-bold tabular-nums text-muted-foreground/30">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      {/* Avatar */}
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-coral/20 to-coral/5 ring-1 ring-coral/15">
                        <span className="text-base font-bold text-coral">
                          {(artist.displayName ?? "A").charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Name */}
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-foreground transition-colors group-hover:text-coral sm:text-base">
                          {artist.displayName ?? "Artist"}
                        </p>
                      </div>

                      <Music className="size-3.5 text-muted-foreground/20" aria-hidden="true" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ─── Video ─── */}
            {event.videoUrl && (
              <section className="mt-8">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Watch
                </h2>
                <div className="mt-4 overflow-hidden rounded-xl border border-border">
                  <VideoPlayer
                    url={event.videoUrl}
                    title={event.title}
                    posterUrl={event.coverimageUrl ?? undefined}
                  />
                </div>
              </section>
            )}

            {/* ─── Venue ─── */}
            {venue && (
              <section className="mt-8">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Venue
                </h2>
                <div className="mt-4 flex items-start gap-4 rounded-xl border border-border p-5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <MapPin className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-foreground">
                      {venue.name}
                    </p>
                    {venue.address && (
                      <p className="mt-1 text-base text-muted-foreground">
                        {venue.address}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ─── Ratings (completed events only) ─── */}
            {event.status === "completed" && ratingsSummary && (
              <section className="mt-8">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Ratings
                </h2>
                <div className="mt-4 flex flex-col gap-4 rounded-xl border border-border p-5 sm:flex-row sm:items-center sm:justify-between">
                  <RatingDisplay
                    averageRating={ratingsSummary.averageRating}
                    totalRatings={ratingsSummary.totalRatings}
                  />
                  <RatingModal
                    eventId={event.$id}
                    eventTitle={event.title}
                    trigger={
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 bg-coral/10 px-4 py-2.5 text-base font-medium text-coral transition-colors hover:bg-coral/20"
                      >
                        <Star className="size-4" />
                        Rate this event
                      </button>
                    }
                  />
                </div>
              </section>
            )}

            {/* ─── Trust footer ─── */}
            <div className="mt-8 flex items-center gap-3 border-t border-border pt-5">
              <Shield className="size-4 text-coral/50" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Official tickets only — cryptographically signed, verified at the
                door. No scalping, no fakes.
              </p>
            </div>

            {/* Bottom spacer for mobile sticky bar */}
            <div className="h-20 lg:h-8" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STICKY MOBILE BAR
          ═══════════════════════════════════════════════════════ */}
      {!isPast && !event.isFree && cheapestTier && checkoutUrl && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <div>
              <p className="text-base font-bold tabular-nums text-foreground">
                From{" "}
                {convertedTierPrices[cheapestTier.$id] ??
                  formatCurrency(cheapestTier.price, cheapestTier.currency)}
              </p>
              <p className="text-sm text-muted-foreground">
                No hidden fees
              </p>
            </div>
            <Link
              href={checkoutUrl}
              className="btn-primary inline-flex items-center gap-2 !py-2.5 !text-base"
            >
              Get Tickets
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}
