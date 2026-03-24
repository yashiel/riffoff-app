import { notFound } from "next/navigation";
import { Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { isCurrentUserAdmin } from "@/lib/auth-utils";
import { EventForm } from "@/components/features/events/EventForm";
import { serialize } from "@/lib/utils";
import type { EventDoc, VenueDoc } from "@/lib/appwrite/types";

export const metadata = { title: "Edit Event" };

interface EditEventPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { eventId } = await params;

  const sessionClient = await createSessionClient();
  if (!sessionClient) notFound();
  const user = await sessionClient.account.get();

  const { databases } = await createAdminClient();

  // Fetch event
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

  // Admin or owner can edit
  const admin = await isCurrentUserAdmin();
  if (event.organiserId !== user.$id && !admin) notFound();

  // Fetch venues
  let venues: VenueDoc[] = [];
  try {
    const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.VENUES, [
      Query.limit(100),
      Query.orderAsc("name"),
    ]);
    venues = result.documents as unknown as VenueDoc[];
  } catch {
    // Venue fetch failed
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-xl sm:text-[36px]">Edit Event</h1>
      <p className="mt-2 text-[13px] text-muted-foreground">
        Update details for {event.title}
      </p>
      <div className="mt-8">
        <EventForm event={serialize(event)} venues={serialize(venues)} />
      </div>
    </div>
  );
}
