import { notFound } from "next/navigation";
import Link from "next/link";
import { Query } from "node-appwrite";
import { ArrowLeft, MessageSquare, Music, Globe, ExternalLink } from "lucide-react";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { isCurrentUserAdmin } from "@/lib/auth-utils";
import { getThreadMessages, getThreadParticipants } from "@/actions/messages";
import { MessageThread } from "@/components/features/messages/MessageThread";
import { ApplicationCard } from "@/components/features/applications/ApplicationCard";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import { serialize } from "@/lib/utils";
import type {
  ApplicationDoc,
  EventDoc,
  VenueDoc,
  ProfileDoc,
} from "@/lib/appwrite/types";
import type { ApplicationWithArtist } from "@/actions/applications";

interface OrganiserApplicationDetailProps {
  params: Promise<{ eventId: string; applicationId: string }>;
}

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

  const { databases } = await createAdminClient();

  // Fetch event and verify organiser ownership
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

  // Fetch application
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

  // Verify application belongs to this event
  if (application.eventId !== eventId) notFound();

  // Fetch venue, artist profile, messages, and participants in parallel
  const [venueResult, artistProfileResult, initialMessages, participants] =
    await Promise.all([
      event.venueId
        ? databases
            .getDocument(DATABASE_ID, COLLECTIONS.VENUES, event.venueId)
            .catch(() => null)
        : Promise.resolve(null),
      databases
        .listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
          Query.equal("userId", application.artistId),
          Query.limit(1),
        ])
        .catch(() => ({ documents: [] })),
      getThreadMessages(applicationId),
      getThreadParticipants(applicationId),
    ]);

  const venue = venueResult as unknown as VenueDoc | null;
  const artistProfile =
    (artistProfileResult.documents[0] as unknown as ProfileDoc) ?? null;

  // Build ApplicationWithArtist for the action card
  const appWithArtist: ApplicationWithArtist = {
    ...application,
    artist: artistProfile,
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Back link */}
      <Link
        href={`/dashboard/events/${eventId}/applications`}
        className="mb-6 inline-flex items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-coral"
      >
        <ArrowLeft className="size-3.5" />
        Back to applications
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-[30px]">
            Review Application
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {event.title}
          </p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      {/* Artist profile card */}
      {artistProfile && (
        <div className="mt-6 rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-coral/10 text-base font-bold text-coral">
              {(artistProfile.displayName ?? "A").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-bold text-foreground">
                {artistProfile.displayName ?? "Unknown Artist"}
              </p>
              {artistProfile.artistGenres.length > 0 && (
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Music className="size-3" />
                  {artistProfile.artistGenres.join(", ")}
                </div>
              )}
            </div>
          </div>

          {artistProfile.bio && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {artistProfile.bio}
            </p>
          )}

          {/* Social links */}
          {artistProfile.socialLinks.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {artistProfile.socialLinks.map((link, i) => (
                <a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-coral"
                >
                  <Globe className="size-3" />
                  {(() => {
                    try {
                      return new URL(link).hostname.replace("www.", "");
                    } catch {
                      return "Link";
                    }
                  })()}
                  <ExternalLink className="size-2.5" />
                </a>
              ))}
            </div>
          )}

          {/* Portfolio URLs */}
          {artistProfile.portfolioUrls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {artistProfile.portfolioUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-coral/10 px-2.5 py-1 text-xs font-medium text-coral transition-colors hover:bg-coral/20"
                >
                  Portfolio
                  <ExternalLink className="size-2.5" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Application actions card */}
      <div className="mt-4">
        <ApplicationCard application={serialize(appWithArtist)} />
      </div>

      {/* Application notes */}
      {application.notes && (
        <div className="mt-4 rounded-xl border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Artist&apos;s Notes
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">
            {application.notes}
          </p>
        </div>
      )}

      {/* Message thread */}
      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="size-4 text-coral" />
          <h2 className="font-display text-lg">Messages</h2>
        </div>
        {participants ? (
          <MessageThread
            applicationId={applicationId}
            currentUserId={user.$id}
            participants={serialize(participants)}
            initialMessages={serialize(initialMessages)}
          />
        ) : (
          <div className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
            Unable to load message thread.
          </div>
        )}
      </div>
    </div>
  );
}
