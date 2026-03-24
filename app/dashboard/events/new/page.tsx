import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { EventForm } from "@/components/features/events/EventForm";
import { serialize } from "@/lib/utils";
import type { VenueDoc } from "@/lib/appwrite/types";

export const metadata = { title: "Create Event" };

export default async function NewEventPage() {
  const { databases } = await createAdminClient();

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
      <h1 className="font-display text-[36px]">Create Event</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        Fill in the details to create a new event
      </p>
      <div className="mt-8">
        <EventForm venues={serialize(venues)} />
      </div>
    </div>
  );
}
