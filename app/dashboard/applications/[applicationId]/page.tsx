import { notFound } from "next/navigation";
import Link from "next/link";
import { Query } from "node-appwrite";
import Image from "next/image";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  MessageSquare,
  StickyNote,
  Music,
  Users,
} from "lucide-react";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { getThreadMessages, getThreadParticipants } from "@/actions/messages";
import { MessageThread } from "@/components/features/messages/MessageThread";
import { ArtistStatusCard } from "@/components/features/applications/ArtistStatusCard";
import { ApplicationTimeline } from "@/components/features/applications/ApplicationTimeline";
import { formatDate, formatRelativeTime, serialize } from "@/lib/utils";
import type {
  ApplicationDoc,
  EventDoc,
  ProfileDoc,
  VenueDoc,
} from "@/lib/appwrite/types";

interface ApplicationDetailPageProps {
  params: Promise<{ applicationId: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Your Application" };
}

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { applicationId } = await params;

  const sessionClient = await createSessionClient();
  if (!sessionClient) notFound();
  const user = await sessionClient.account.get();

  const { databases } = await createAdminClient();

  // Application
  let application: ApplicationDoc;
  try {
    application = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.APPLICATIONS,
      applicationId,
    )) as unknown as ApplicationDoc;
  } catch {
    notFound();
  }
  if (application.artistId !== user.$id) notFound();

  // Parallel fetches: event, venue, organiser profile, lineup count, messages, audit log
  const [
    eventResult,
    messagesResult,
    participants,
    auditLogResult,
    lineupResult,
  ] = await Promise.all([
    databases
      .getDocument(DATABASE_ID, COLLECTIONS.EVENTS, application.eventId)
      .catch(() => null),
    getThreadMessages(applicationId),
    getThreadParticipants(applicationId),
    databases
      .listDocuments(DATABASE_ID, COLLECTIONS.AUDIT_LOGS, [
        Query.equal("entityType", "application"),
        Query.equal("entityId", applicationId),
        Query.orderAsc("$createdAt"),
        Query.limit(50),
      ])
      .catch(() => ({ documents: [] })),
    databases
      .listDocuments(DATABASE_ID, COLLECTIONS.APPLICATIONS, [
        Query.equal("eventId", application.eventId),
        Query.equal("status", "accepted"),
        Query.limit(100),
      ])
      .catch(() => ({ documents: [] })),
  ]);

  const event = eventResult as unknown as EventDoc | null;

  // Venue + organiser profile (need event first)
  const [venueResult, organiserProfileResult] = await Promise.all([
    event?.venueId
      ? databases.getDocument(DATABASE_ID, COLLECTIONS.VENUES, event.venueId).catch(() => null)
      : Promise.resolve(null),
    event?.organiserId
      ? databases
          .listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
            Query.equal("userId", event.organiserId),
            Query.limit(1),
          ])
          .catch(() => ({ documents: [] }))
      : Promise.resolve({ documents: [] }),
  ]);

  const venue = venueResult as unknown as VenueDoc | null;
  const organiserProfile =
    (organiserProfileResult.documents[0] as unknown as ProfileDoc) ?? null;
  const acceptedLineupCount = lineupResult.documents.length;

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Back link */}
      <Link
        href="/dashboard/applications"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-coral"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to my applications
      </Link>

      {/* Hero — event-prominent for the artist's view */}
      {event && (
        <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card">
          {event.coverimageUrl && (
            <div className="pointer-events-none absolute inset-0 -z-10">
              <Image
                src={event.coverimageUrl}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                className="scale-110 object-cover opacity-30 blur-2xl"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-card/40 via-card/70 to-card" />
            </div>
          )}
          <div className="relative p-6 sm:p-8 lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
              Your Application
            </p>
            <h1 className="mt-2 font-display text-3xl leading-tight text-foreground sm:text-[34px] lg:text-[44px]">
              <Link
                href={`/events/${event.$id}`}
                className="transition-colors hover:text-coral"
              >
                {event.title}
              </Link>
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground lg:text-base">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5 text-coral/70" aria-hidden="true" />
                {formatDate(event.startsAt, { dateStyle: "medium" })}
              </span>
              {venue && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {venue.name}
                </span>
              )}
              {organiserProfile && (
                <span className="inline-flex items-center gap-1.5">
                  Organised by{" "}
                  <span className="font-medium text-foreground">
                    {organiserProfile.displayName}
                  </span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-muted-foreground/70">
                Applied {formatRelativeTime(application.submittedAt)}
              </span>
            </div>

            {/* Lineup teaser if accepted artists exist */}
            {acceptedLineupCount > 0 && (
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-coral/10 px-3 py-1 text-xs font-medium text-coral ring-1 ring-coral/20">
                <Users className="size-3" aria-hidden="true" />
                {acceptedLineupCount}{" "}
                {acceptedLineupCount === 1 ? "artist" : "artists"} confirmed on
                this lineup
              </p>
            )}
          </div>
        </section>
      )}

      {/* Status card — live updates */}
      <div className="mt-6">
        <ArtistStatusCard
          applicationId={applicationId}
          initialStatus={application.status}
        />
      </div>

      {/* Two-column body — wider main column for the conversation */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Cover note (artist's own) */}
          {application.notes && (
            <section className="rounded-2xl border border-border/60 bg-card p-5">
              <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <StickyNote className="size-3.5 text-coral" aria-hidden="true" />
                Your Cover Note
              </h2>
              <blockquote className="border-l-2 border-coral/40 pl-4 text-base italic leading-relaxed text-foreground/95">
                &ldquo;{application.notes}&rdquo;
              </blockquote>
              <p className="mt-3 text-xs text-muted-foreground/60">
                Submitted with your application —{" "}
                {formatDate(application.submittedAt, { dateStyle: "medium" })}
              </p>
            </section>
          )}

          {/* Event details */}
          {event && (
            <section className="rounded-2xl border border-border/60 bg-card p-5">
              <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <Music className="size-3.5 text-coral" aria-hidden="true" />
                Event Details
              </h2>
              {event.description && (
                <p className="text-sm leading-relaxed text-foreground/85">
                  {event.description}
                </p>
              )}
              {event.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {event.genres.map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center gap-1 rounded-full bg-coral/10 px-2.5 py-0.5 text-xs font-medium text-coral ring-1 ring-coral/20"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
              <Link
                href={`/events/${event.$id}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-coral transition-colors hover:underline"
              >
                View full event page →
              </Link>
            </section>
          )}

          {/* Message thread */}
          <section className="rounded-2xl border border-border/60 bg-card p-5">
            <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <MessageSquare className="size-3.5 text-coral" aria-hidden="true" />
              Conversation with{" "}
              {organiserProfile?.displayName ?? "the organiser"}
            </h2>
            {participants ? (
              <MessageThread
                applicationId={applicationId}
                currentUserId={user.$id}
                participants={serialize(participants)}
                initialMessages={serialize(messagesResult)}
              />
            ) : (
              <div className="text-sm italic text-muted-foreground">
                Unable to load message thread.
              </div>
            )}
          </section>
        </div>

        {/* Sidebar column */}
        <aside className="lg:col-span-1 space-y-5">
          <section className="rounded-2xl border border-border/60 bg-card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Activity
            </h2>
            <ApplicationTimeline
              currentStatus={application.status}
              submittedAt={application.submittedAt}
              auditLog={(auditLogResult.documents as Array<{
                $id: string;
                $createdAt: string;
                action: string;
                actorId: string;
              }>).map((d) => ({
                id: d.$id,
                createdAt: d.$createdAt,
                action: d.action,
              }))}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
