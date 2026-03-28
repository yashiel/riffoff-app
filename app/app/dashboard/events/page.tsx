import Link from "next/link";
import {
  Plus,
  Calendar,
  MapPin,
  ChevronRight,
  Crown,
  ArrowRight,
} from "lucide-react";
import { EmptyState } from "@/components/features/shared/EmptyState";
import { getOrganiserEvents } from "@/actions/events";
import { isCurrentUserAdmin } from "@/lib/auth-utils";
import { createSessionClient } from "@/lib/appwrite/server";
import { serialize, formatDate } from "@/lib/utils";
import { EventListClient } from "@/components/features/events/EventListClient";
import type { EventWithVenue } from "@/actions/events";

export const metadata = { title: "My Events" };
export const dynamic = "force-dynamic";

export default async function OrgEventsPage() {
  let events: Awaited<ReturnType<typeof getOrganiserEvents>> = [];
  let currentUserId = "";
  let isAdmin = false;

  try {
    const sessionClient = await createSessionClient();
    if (sessionClient) {
      const user = await sessionClient.account.get();
      currentUserId = user.$id;
    }
    isAdmin = await isCurrentUserAdmin();
    events = await getOrganiserEvents();
  } catch {}

  const serialized = serialize(events) as EventWithVenue[];

  // For admins: separate "my created" vs "all"
  const myEvents = isAdmin
    ? serialized.filter((e) => e.organiserId === currentUserId)
    : [];
  const hasMyEvents = isAdmin && myEvents.length > 0;
  const otherEventsExist = isAdmin && serialized.length > myEvents.length;

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight sm:text-[40px]">
            My Events
          </h1>
          <p className="mt-2 text-base text-muted-foreground/80">
            Manage, publish, and track your events
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="btn-primary inline-flex w-fit items-center gap-2 !rounded-xl !px-6 !py-3 !text-base"
        >
          <Plus className="size-4" />
          Create Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No events yet"
            description="Create your first event to start selling tickets."
            actionLabel="Create Event"
            actionHref="/dashboard/events/new"
          />
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {/* ═══ MY CREATED EVENTS — admin only ═══ */}
          {hasMyEvents && (
            <section>
              {/* Section header */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-coral/20 bg-coral/10 px-3 py-1.5 text-sm font-bold uppercase tracking-wider text-coral">
                  <Crown className="size-3.5" aria-hidden="true" />
                  Created by you
                  <span className="opacity-50">{myEvents.length}</span>
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Horizontal scroll row */}
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {myEvents.map((event) => (
                  <MyEventCard key={event.$id} event={event} />
                ))}
              </div>
            </section>
          )}

          {/* ═══ ALL EVENTS — full list with filters ═══ */}
          <section>
            {hasMyEvents && otherEventsExist && (
              <div className="mb-4 flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  All Events
                  <span className="opacity-50">{serialized.length}</span>
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <EventListClient events={serialized} />
          </section>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   MyEventCard — compact horizontal card for "created by you" row
   ───────────────────────────────────────────────── */
function MyEventCard({ event }: { event: EventWithVenue }) {
  const isPast = new Date(event.endsAt) < new Date();
  const isLive =
    event.status === "published" &&
    new Date(event.startsAt) <= new Date() &&
    new Date(event.endsAt) >= new Date();

  return (
    <Link
      href={`/dashboard/events/${event.$id}`}
      className="group flex w-[340px] shrink-0 overflow-hidden rounded-xl border border-coral/10 bg-coral/[0.03] transition-all hover:border-coral/25 hover:bg-coral/[0.06]"
    >
      {/* Thumbnail */}
      <div
        className={`relative w-[100px] shrink-0 overflow-hidden ${isPast ? "grayscale-[30%]" : ""}`}
      >
        {event.coverimageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverimageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted/80 text-lg text-muted-foreground/50">
            ♪
          </div>
        )}
        {isLive && (
          <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-emerald-500/90 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white">
            <span className="size-1 animate-pulse rounded-full bg-white" />
            Live
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-center px-3.5 py-3">
        <h3 className="line-clamp-1 text-base font-bold text-foreground transition-colors group-hover:text-coral">
          {event.title}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="size-3 shrink-0 text-coral/50" aria-hidden="true" />
          {formatDate(event.startsAt, { dateStyle: "medium" })}
        </p>
        {event.venue && (
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground/60">
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{event.venue.name}</span>
          </p>
        )}
      </div>

      {/* Arrow */}
      <div className="flex items-center pr-3">
        <ChevronRight className="size-4 text-coral/30 transition-all group-hover:translate-x-0.5 group-hover:text-coral" />
      </div>
    </Link>
  );
}
