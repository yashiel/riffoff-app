import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, MessageSquare } from "lucide-react";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { getThreadMessages, getThreadParticipants } from "@/actions/messages";
import { MessageThread } from "@/components/features/messages/MessageThread";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import { formatDate, serialize } from "@/lib/utils";
import type { ApplicationDoc, EventDoc, VenueDoc } from "@/lib/appwrite/types";

interface ApplicationDetailPageProps {
  params: Promise<{ applicationId: string }>;
}

export async function generateMetadata({ params }: ApplicationDetailPageProps) {
  return { title: "Application Details" };
}

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { applicationId } = await params;

  const sessionClient = await createSessionClient();
  if (!sessionClient) notFound();
  const user = await sessionClient.account.get();

  const { databases } = await createAdminClient();

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

  // Verify the artist owns this application
  if (application.artistId !== user.$id) notFound();

  // Fetch event and venue
  let event: EventDoc | null = null;
  let venue: VenueDoc | null = null;
  try {
    event = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      application.eventId,
    )) as unknown as EventDoc;

    if (event.venueId) {
      venue = (await databases
        .getDocument(DATABASE_ID, COLLECTIONS.VENUES, event.venueId)
        .catch(() => null)) as unknown as VenueDoc | null;
    }
  } catch {
    // Event may have been deleted
  }

  // Fetch messages and participants
  const [initialMessages, participants] = await Promise.all([
    getThreadMessages(applicationId),
    getThreadParticipants(applicationId),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Back link */}
      <Link
        href="/dashboard/applications"
        className="mb-6 inline-flex items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-coral"
      >
        <ArrowLeft className="size-3.5" />
        Back to applications
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-display text-2xl sm:text-[30px]">
          Application Details
        </h1>
        <StatusBadge status={application.status} />
      </div>

      {/* Event info card */}
      {event && (
        <div className="mt-6 rounded-xl border border-border p-4">
          <Link
            href={`/events/${event.$id}`}
            className="text-base font-bold text-foreground transition-colors hover:text-coral"
          >
            {event.title}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3 text-coral" />
              {formatDate(event.startsAt, { dateStyle: "medium" })}
            </span>
            {venue && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3" />
                {venue.name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Application notes */}
      {application.notes && (
        <div className="mt-4 rounded-xl border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Your Notes
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
