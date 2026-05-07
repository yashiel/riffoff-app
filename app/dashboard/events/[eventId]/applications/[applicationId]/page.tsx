import { notFound } from "next/navigation";
import Link from "next/link";
import { Query } from "node-appwrite";
import {
  ArrowLeft,
  MessageSquare,
  Globe,
  ExternalLink,
  StickyNote,
  User,
} from "lucide-react";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { isCurrentUserAdmin } from "@/lib/auth-utils";
import { getThreadMessages, getThreadParticipants } from "@/actions/messages";
import { MessageThread } from "@/components/features/messages/MessageThread";
import { ApplicationHero } from "@/components/features/applications/ApplicationHero";
import { OrganiserDecisionCard } from "@/components/features/applications/OrganiserDecisionCard";
import { ApplicationTimeline } from "@/components/features/applications/ApplicationTimeline";
import { ApplicationStats } from "@/components/features/applications/ApplicationStats";
import { InternalNotes } from "@/components/features/applications/InternalNotes";
import { QuickReplies } from "@/components/features/applications/QuickReplies";
import { serialize } from "@/lib/utils";
import type {
  ApplicationDoc,
  EventDoc,
  ProfileDoc,
  VenueDoc,
} from "@/lib/appwrite/types";

interface OrganiserApplicationDetailProps {
  params: Promise<{ eventId: string; applicationId: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Review Application" };
}

export default async function OrganiserApplicationDetailPage({
  params,
}: OrganiserApplicationDetailProps) {
  const { eventId, applicationId } = await params;

  const sessionClient = await createSessionClient();
  if (!sessionClient) notFound();
  const user = await sessionClient.account.get();

  const { databases, users } = await createAdminClient();

  // Event + ownership check
  let event: EventDoc;
  try {
    event = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      eventId,
    )) as unknown as EventDoc;
  } catch {
    notFound();
  }

  const isAdmin = await isCurrentUserAdmin();
  if (event.organiserId !== user.$id && !isAdmin) notFound();

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
  if (application.eventId !== eventId) notFound();

  // Parallel: venue, artist profile, messages, participants, audit log,
  // all applications for this event (for queue stats), all applications
  // by this artist (for track-record stats).
  const [
    venueResult,
    artistProfileResult,
    initialMessages,
    participants,
    auditLogResult,
    eventApplicationsResult,
    artistApplicationsResult,
  ] = await Promise.all([
    event.venueId
      ? databases.getDocument(DATABASE_ID, COLLECTIONS.VENUES, event.venueId).catch(() => null)
      : Promise.resolve(null),
    databases
      .listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
        Query.equal("userId", application.artistId),
        Query.limit(1),
      ])
      .catch(() => ({ documents: [] })),
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
        Query.equal("eventId", eventId),
        Query.orderAsc("submittedAt"),
        Query.limit(500),
      ])
      .catch(() => ({ documents: [], total: 0 })),
    databases
      .listDocuments(DATABASE_ID, COLLECTIONS.APPLICATIONS, [
        Query.equal("artistId", application.artistId),
        Query.limit(500),
      ])
      .catch(() => ({ documents: [], total: 0 })),
  ]);

  const venue = venueResult as unknown as VenueDoc | null;
  const artistProfile =
    (artistProfileResult.documents[0] as unknown as ProfileDoc) ?? null;

  // Artist email
  let artistEmail: string | null = null;
  try {
    const u = await users.get(application.artistId);
    artistEmail = u.email ?? null;
  } catch {
    // ignore
  }

  // Stats — derive from the parallel fetches
  const eventApps = eventApplicationsResult.documents as unknown as ApplicationDoc[];
  const submissionOrder = Math.max(
    1,
    eventApps.findIndex((a) => a.$id === applicationId) + 1,
  );

  const artistApps = artistApplicationsResult.documents as unknown as ApplicationDoc[];
  const artistTotalApplications = artistApps.length;
  const artistAcceptedCount = artistApps.filter((a) => a.status === "accepted").length;

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Back link */}
      <Link
        href={`/dashboard/events/${eventId}/applications`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-coral"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to applications
      </Link>

      {/* Hero — event cover + artist identity + star toggle */}
      <ApplicationHero
        applicationId={applicationId}
        artistProfile={serialize(artistProfile)}
        artistEmail={artistEmail}
        eventTitle={event.title}
        eventStartsAt={event.startsAt}
        eventCoverUrl={event.coverimageUrl ?? null}
        venueName={venue?.name ?? null}
        submittedAt={application.submittedAt}
      />

      {/* Decision card — colour-coded status with reversible actions */}
      <div className="mt-6">
        <OrganiserDecisionCard
          applicationId={applicationId}
          initialStatus={application.status}
          artistName={artistProfile?.displayName ?? "the artist"}
        />
      </div>

      {/* Three-column body — left context, center conversation, right tools */}
      <div className="mt-6 grid gap-5 lg:grid-cols-12">
        {/* ── Left: Context (3/12 on lg) ────────── */}
        <div className="space-y-5 lg:col-span-3">
          {/* Cover Note */}
          {application.notes && (
            <section className="rounded-2xl border border-border/60 bg-card p-5">
              <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <StickyNote className="size-3.5 text-coral" aria-hidden="true" />
                Cover Note
              </h2>
              <blockquote className="border-l-2 border-coral/40 pl-4 text-base italic leading-relaxed text-foreground/95">
                &ldquo;{application.notes}&rdquo;
              </blockquote>
            </section>
          )}

          {/* Artist details */}
          {artistProfile && (
            <section className="rounded-2xl border border-border/60 bg-card p-5">
              <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <User className="size-3.5 text-coral" aria-hidden="true" />
                About the Artist
              </h2>

              {artistProfile.bio ? (
                <p className="mb-4 text-sm leading-relaxed text-foreground/85">
                  {artistProfile.bio}
                </p>
              ) : (
                <p className="mb-4 text-sm italic text-muted-foreground/60">
                  This artist hasn&apos;t written a bio yet.
                </p>
              )}

              {(artistProfile.socialLinks.length > 0 ||
                artistProfile.portfolioUrls.length > 0) && (
                <div className="space-y-2 border-t border-border/40 pt-4">
                  {artistProfile.socialLinks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {artistProfile.socialLinks.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Globe className="size-3" aria-hidden="true" />
                          {hostnameOf(link)}
                          <ExternalLink className="size-2.5" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  )}
                  {artistProfile.portfolioUrls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {artistProfile.portfolioUrls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-coral/10 px-2.5 py-1 text-xs font-medium text-coral transition-colors hover:bg-coral/20"
                        >
                          Portfolio
                          <ExternalLink className="size-2.5" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── Center: Conversation (6/12 on lg) ────────── */}
        <div className="space-y-5 lg:col-span-6">
          <QuickReplies
            artistName={artistProfile?.displayName ?? "there"}
            eventTitle={event.title}
          />

          <section className="rounded-2xl border border-border/60 bg-card p-5">
            <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <MessageSquare className="size-3.5 text-coral" aria-hidden="true" />
              Conversation with {artistProfile?.displayName ?? "the artist"}
            </h2>
            {participants ? (
              <MessageThread
                applicationId={applicationId}
                currentUserId={user.$id}
                participants={serialize(participants)}
                initialMessages={serialize(initialMessages)}
              />
            ) : (
              <div className="text-sm italic text-muted-foreground">
                Unable to load message thread.
              </div>
            )}
          </section>
        </div>

        {/* ── Right: Tools (3/12 on lg) ────────── */}
        <aside className="space-y-5 lg:col-span-3">
          <ApplicationStats
            submittedAt={application.submittedAt}
            eventStartsAt={event.startsAt}
            totalApplicationsForEvent={eventApplicationsResult.total}
            submissionOrder={submissionOrder}
            artistTotalApplications={artistTotalApplications}
            artistAcceptedCount={artistAcceptedCount}
            artistTrustScore={artistProfile?.trustScore ?? null}
          />

          <InternalNotes applicationId={applicationId} />

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

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}
