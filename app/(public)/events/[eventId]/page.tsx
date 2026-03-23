import { notFound } from "next/navigation";
import Image from "next/image";
import { Calendar, MapPin, Users, Clock, Shield } from "lucide-react";
import { TierList } from "@/components/features/events/TierList";
import { RSVPButton } from "@/components/features/events/RSVPButton";
import { getEventWithDetails } from "@/actions/events";
import { getUserRSVP } from "@/actions/rsvps";
import { formatDate, formatRelativeTime } from "@/lib/utils";

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Two-column layout — DICE-inspired sticky sidebar */}
      <div className="grid gap-10 lg:grid-cols-[340px_1fr]">
        {/* Left: Sticky image sidebar */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          {/* Event artwork — portrait ratio */}
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
            {event.coverimageUrl ? (
              <Image
                src={event.coverimageUrl}
                alt={event.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[#2a2a2a]">
                <span className="text-7xl opacity-10">♪</span>
              </div>
            )}
          </div>

          {/* Trust message — DICE pattern */}
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3.5">
            <Shield className="mt-0.5 size-4 shrink-0 text-coral" />
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              RiffOff protects fans and artists. Tickets are cryptographically
              signed and verified at the door. No scalping, no fakes.
            </p>
          </div>
        </div>

        {/* Right: Scrollable content */}
        <div className="space-y-8">
          {/* Title */}
          <div>
            {event.genres.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {event.genres.map((genre) => (
                  <span key={genre} className="genre-pill">
                    {genre}
                  </span>
                ))}
              </div>
            )}
            <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[0.95]">
              {event.title}
            </h1>
          </div>

          {/* Date + Venue info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Calendar className="size-4 text-coral" />
              <div>
                <p className="text-[16px] font-medium text-coral">
                  {formatDate(event.startsAt, { dateStyle: "full" })}
                </p>
                <p className="text-[14px] text-muted-foreground">
                  {formatDate(event.startsAt, { timeStyle: "short" })} –{" "}
                  {formatDate(event.endsAt, { timeStyle: "short" })}
                  {!isPast && (
                    <span className="ml-2 text-white/50">
                      · {formatRelativeTime(event.startsAt)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {venue && (
              <div className="flex items-center gap-2.5">
                <MapPin className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-[16px] font-medium text-white">
                    {venue.name}
                  </p>
                  {venue.address && (
                    <p className="text-[14px] text-muted-foreground">
                      {venue.address}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <Users className="size-4 text-muted-foreground" />
              <p className="text-[14px] text-muted-foreground">
                Capacity: {event.capacity.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Price bar — DICE-inspired with transparency messaging */}
          {!isPast && !event.isFree && tiers.length > 0 && (
            <div className="rounded-xl bg-[#242424] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[20px] font-bold text-white">
                    From {tiers[0] ? `${tiers[0].currency} ${tiers[0].price.toFixed(2)}` : "—"}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    The price you see is the price you pay. No surprises.
                  </p>
                </div>
                <a
                  href={`/events/${event.$id}/checkout?tierId=${tiers[0]?.$id}&qty=1&eventTitle=${encodeURIComponent(event.title)}&tierName=${encodeURIComponent(tiers[0]?.name ?? "")}&price=${tiers[0]?.price ?? 0}&currency=${tiers[0]?.currency ?? "MYR"}`}
                  className="btn-primary whitespace-nowrap"
                >
                  Get Tickets
                </a>
              </div>
            </div>
          )}

          {/* Tickets / RSVP section */}
          {isPast ? (
            <div className="flex items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
              <Clock className="size-5 text-muted-foreground" />
              <p className="font-medium text-muted-foreground">
                This event has ended
              </p>
            </div>
          ) : event.isFree ? (
            <RSVPButton
              eventId={event.$id}
              currentStatus={userRSVP?.status ?? null}
              rsvpCount={rsvpCount}
            />
          ) : (
            <TierList
              tiers={tiers}
              isFree={event.isFree}
              eventId={event.$id}
              eventTitle={event.title}
            />
          )}

          {/* Divider */}
          <div className="border-t border-[rgba(255,255,255,0.06)]" />

          {/* About */}
          {event.description && (
            <div>
              <h2 className="font-display text-[24px]">About</h2>
              <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-muted-foreground">
                {event.description}
              </p>
            </div>
          )}

          {/* Lineup */}
          {lineup.length > 0 && (
            <div>
              <h2 className="font-display text-[24px]">Lineup</h2>
              <div className="mt-4 space-y-3">
                {lineup.map(({ artist }) => (
                  <div
                    key={artist.$id}
                    className="flex items-center gap-3 rounded-lg border border-[rgba(255,255,255,0.06)] p-3"
                  >
                    <div className="flex size-10 items-center justify-center rounded-full bg-coral/10 text-[14px] font-bold text-coral">
                      {(artist.displayName ?? "A").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[15px] font-medium text-white">
                      {artist.displayName ?? "Artist"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Venue section */}
          {venue && (
            <div>
              <h2 className="font-display text-[24px]">Venue</h2>
              <div className="mt-3">
                <p className="text-[16px] font-medium text-white">
                  {venue.name}
                </p>
                {venue.address && (
                  <p className="mt-1 text-[14px] text-muted-foreground">
                    {venue.address}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
