export const dynamic = "force-dynamic";

import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { EventForm } from "@/components/features/events/EventForm";
import { getAvailableGenres } from "@/actions/events";
import { serialize } from "@/lib/utils";
import type { VenueDoc } from "@/lib/appwrite/types";

export const metadata = { title: "Create Event" };

export default async function NewEventPage() {
  const { databases } = await createAdminClient();

  const [venueResult, genres] = await Promise.all([
    databases
      .listDocuments(DATABASE_ID, COLLECTIONS.VENUES, [
        Query.limit(100),
        Query.orderAsc("name"),
      ])
      .catch(() => ({ documents: [] })),
    getAvailableGenres().catch(() => [] as string[]),
  ]);

  const venues = venueResult.documents as unknown as VenueDoc[];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl sm:text-3xl lg:text-[36px]">Create Event</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Fill in the details to create a new event
      </p>
      <div className="mt-8">
        <EventForm venues={serialize(venues)} availableGenres={genres} />
      </div>
    </div>
  );
}
