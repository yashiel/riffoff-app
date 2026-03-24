"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { isCurrentUserAdmin } from "@/lib/auth-utils";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { notifyEventCancelled } from "@/actions/notifications";
import type {
  EventDoc,
  VenueDoc,
  TicketTierDoc,
  ApplicationDoc,
  ProfileDoc,
} from "@/lib/appwrite/types";

const PAGE_SIZE = 12;

export interface EventFilters {
  search?: string;
  genre?: string;
  dateRange?: "today" | "weekend" | "week" | "month" | "all";
  page?: number;
}

export interface EventWithVenue extends EventDoc {
  venue: VenueDoc | null;
  minPrice?: number | null;
  minPriceCurrency?: string | null;
}

export interface EventDetails {
  event: EventDoc;
  venue: VenueDoc | null;
  tiers: TicketTierDoc[];
  lineup: Array<{ application: ApplicationDoc; artist: ProfileDoc }>;
  rsvpCount: number;
}

/** List published events with optional filters and pagination */
export async function getPublishedEvents(filters: EventFilters = {}) {
  const { databases } = await createAdminClient();
  const { search, genre, dateRange, page = 1 } = filters;

  const queries: string[] = [
    Query.equal("status", "published"),
    Query.orderDesc("startsAt"),
    Query.limit(PAGE_SIZE),
    Query.offset((page - 1) * PAGE_SIZE),
  ];

  // Date filtering
  const now = new Date().toISOString();
  if (dateRange && dateRange !== "all") {
    queries.push(Query.greaterThanEqual("startsAt", now));

    const end = getDateRangeEnd(dateRange);
    if (end) {
      queries.push(Query.lessThanEqual("startsAt", end));
    }
  }

  // Genre filter
  if (genre) {
    queries.push(Query.contains("genres", [genre]));
  }

  // Search
  if (search) {
    queries.push(Query.search("title", search));
  }

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.EVENTS,
    queries,
  );

  const events = result.documents as unknown as EventDoc[];

  // Fetch venues for all events in parallel
  const venueIds = [...new Set(events.map((e) => e.venueId))];
  const venueMap = new Map<string, VenueDoc>();

  if (venueIds.length > 0) {
    const venueResults = await Promise.all(
      venueIds.map((id) =>
        databases
          .getDocument(DATABASE_ID, COLLECTIONS.VENUES, id)
          .catch(() => null),
      ),
    );
    for (const venue of venueResults) {
      if (venue) venueMap.set(venue.$id, venue as unknown as VenueDoc);
    }
  }

  // Batch-fetch minimum tier prices for all events on this page
  const eventIds = events.map((e) => e.$id);
  const priceMap = new Map<string, { price: number; currency: string }>();

  if (eventIds.length > 0) {
    try {
      const tiersResult = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.TICKET_TIERS,
        [Query.equal("eventId", eventIds), Query.limit(500)],
      );

      for (const doc of tiersResult.documents) {
        const tier = doc as unknown as TicketTierDoc;
        const existing = priceMap.get(tier.eventId);
        if (!existing || tier.price < existing.price) {
          priceMap.set(tier.eventId, { price: tier.price, currency: tier.currency });
        }
      }
    } catch {
      // Tiers fetch failed — prices will show as null
    }
  }

  const eventsWithVenue: EventWithVenue[] = events.map((event) => {
    const minTier = priceMap.get(event.$id);
    return {
      ...event,
      venue: venueMap.get(event.venueId) ?? null,
      minPrice: minTier?.price ?? null,
      minPriceCurrency: minTier?.currency ?? null,
    };
  });

  return {
    events: eventsWithVenue,
    total: result.total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(result.total / PAGE_SIZE),
  };
}

/** Get a single event by ID — returns null for non-existent or non-published (unless organiser/admin) */
export async function getEventById(
  eventId: string,
): Promise<EventDoc | null> {
  const { databases } = await createAdminClient();

  try {
    const event = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      eventId,
    )) as unknown as EventDoc;

    // Public access: only published events
    if (event.status !== "published") {
      // Check if current user is the organiser or admin
      const sessionClient = await createSessionClient();
      if (!sessionClient) return null;

      try {
        const user = await sessionClient.account.get();
        const admin = await isCurrentUserAdmin();
        if (event.organiserId !== user.$id && !admin) {
          return null;
        }
      } catch {
        return null;
      }
    }

    return event;
  } catch {
    return null;
  }
}

/** Get full event details: event + venue + tiers + accepted artists + RSVP count */
export async function getEventWithDetails(
  eventId: string,
): Promise<EventDetails | null> {
  const { databases } = await createAdminClient();

  try {
    const event = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      eventId,
    )) as unknown as EventDoc;

    if (event.status !== "published") {
      const sessionClient = await createSessionClient();
      if (!sessionClient) return null;
      try {
        const user = await sessionClient.account.get();
        const admin = await isCurrentUserAdmin();
        if (event.organiserId !== user.$id && !admin) return null;
      } catch {
        return null;
      }
    }

    // Parallel fetches
    const [venueResult, tiersResult, applicationsResult, rsvpResult] =
      await Promise.all([
        databases
          .getDocument(DATABASE_ID, COLLECTIONS.VENUES, event.venueId)
          .catch(() => null),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.TICKET_TIERS, [
          Query.equal("eventId", eventId),
          Query.orderAsc("sortOrder"),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.APPLICATIONS, [
          Query.equal("eventId", eventId),
          Query.equal("status", "accepted"),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.RSVPS, [
          Query.equal("eventId", eventId),
          Query.equal("status", "going"),
        ]),
      ]);

    const venue = venueResult as unknown as VenueDoc | null;
    const tiers = tiersResult.documents as unknown as TicketTierDoc[];
    const applications =
      applicationsResult.documents as unknown as ApplicationDoc[];

    // Fetch artist profiles for accepted applications
    const lineup: EventDetails["lineup"] = [];
    if (applications.length > 0) {
      const artistProfiles = await Promise.all(
        applications.map((app) =>
          databases
            .listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
              Query.equal("userId", app.artistId),
              Query.limit(1),
            ])
            .then(
              (res) => (res.documents[0] as unknown as ProfileDoc) ?? null,
            )
            .catch(() => null),
        ),
      );

      for (let i = 0; i < applications.length; i++) {
        const artist = artistProfiles[i];
        if (artist) {
          lineup.push({ application: applications[i], artist });
        }
      }
    }

    return {
      event,
      venue,
      tiers,
      lineup,
      rsvpCount: rsvpResult.total,
    };
  } catch {
    return null;
  }
}

/** Get 6 upcoming published events for the home page */
export async function getUpcomingEvents(): Promise<EventWithVenue[]> {
  const result = await getPublishedEvents({
    dateRange: "all",
    page: 1,
  });
  // Return first 6
  return result.events.slice(0, 6);
}

/** Get all unique genres from published events */
export async function getAvailableGenres(): Promise<string[]> {
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.EVENTS,
    [
      Query.equal("status", "published"),
      Query.greaterThanEqual("startsAt", new Date().toISOString()),
      Query.select(["genres"]),
      Query.limit(100),
    ],
  );

  const genreSet = new Set<string>();
  for (const doc of result.documents) {
    const event = doc as unknown as EventDoc;
    for (const genre of event.genres) {
      genreSet.add(genre);
    }
  }

  return [...genreSet].sort();
}

// ─── Organiser Actions ────────────────────────────────

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  venueId: z.string().min(1),
  genres: z.array(z.string().max(50)).max(10).default([]),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  capacity: z.number().int().min(1),
  isFree: z.boolean(),
  coverimageUrl: z.string().optional(),
});

export type EventFormResult = { error?: string; eventId?: string };

/** Create a new event (draft status) */
export async function createEvent(
  input: z.infer<typeof createEventSchema>,
): Promise<EventFormResult> {
  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  try {
    const event = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      ID.unique(),
      {
        organiserId: user.$id,
        venueId: parsed.data.venueId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        genres: parsed.data.genres,
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
        status: "draft",
        capacity: parsed.data.capacity,
        coverimageUrl: parsed.data.coverimageUrl ?? null,
        isFree: parsed.data.isFree,
      },
    );

    revalidatePath("/dashboard/events");
    return { eventId: event.$id };
  } catch {
    return { error: "Failed to create event" };
  }
}

const updateEventSchema = z.object({
  eventId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  venueId: z.string().min(1).optional(),
  genres: z.array(z.string().max(50)).max(10).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  capacity: z.number().int().min(1).optional(),
  isFree: z.boolean().optional(),
  coverimageUrl: z.string().optional(),
});

/** Update an event (organiser only) */
export async function updateEvent(
  input: z.infer<typeof updateEventSchema>,
): Promise<EventFormResult> {
  const parsed = updateEventSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  // Verify ownership
  const event = (await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.EVENTS,
    parsed.data.eventId,
  )) as unknown as EventDoc;

  const admin = await isCurrentUserAdmin();
  if (event.organiserId !== user.$id && !admin) {
    return { error: "Not authorized" };
  }

  // Build update payload (only provided fields)
  const { eventId, ...fields } = parsed.data;
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) updates[key] = value;
  }

  if (Object.keys(updates).length === 0) {
    return { eventId };
  }

  try {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      eventId,
      updates,
    );
    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath("/dashboard/events");
    return { eventId };
  } catch {
    return { error: "Failed to update event" };
  }
}

/** Publish an event (draft → published) */
export async function publishEvent(
  eventId: string,
): Promise<EventFormResult> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const event = (await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.EVENTS,
    eventId,
  )) as unknown as EventDoc;

  const adminPub = await isCurrentUserAdmin();
  if (event.organiserId !== user.$id && !adminPub) return { error: "Not authorized" };
  if (event.status !== "draft") return { error: "Only draft events can be published" };

  // Check: paid events must have at least 1 tier
  if (!event.isFree) {
    const tiers = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TICKET_TIERS,
      [Query.equal("eventId", eventId), Query.limit(1)],
    );
    if (tiers.total === 0) {
      return { error: "Add at least one ticket tier before publishing" };
    }
  }

  try {
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.EVENTS, eventId, {
      status: "published",
    });

    // Audit log
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.AUDIT_LOGS,
      ID.unique(),
      {
        actorId: user.$id,
        action: "event.published",
        entityType: "event",
        entityId: eventId,
        metadata: JSON.stringify({ title: event.title }),
      },
    );

    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath("/dashboard/events");
    revalidatePath("/events");
    return { eventId };
  } catch {
    return { error: "Failed to publish event" };
  }
}

/** Cancel an event (any status → cancelled) */
export async function cancelEvent(
  eventId: string,
): Promise<EventFormResult> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const event = (await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.EVENTS,
    eventId,
  )) as unknown as EventDoc;

  const adminCancel = await isCurrentUserAdmin();
  if (event.organiserId !== user.$id && !adminCancel) return { error: "Not authorized" };
  if (event.status === "cancelled") return { error: "Event is already cancelled" };

  try {
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.EVENTS, eventId, {
      status: "cancelled",
    });

    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.AUDIT_LOGS,
      ID.unique(),
      {
        actorId: user.$id,
        action: "event.cancelled",
        entityType: "event",
        entityId: eventId,
        metadata: JSON.stringify({ title: event.title }),
      },
    );

    // Notify ticket holders about cancellation
    const ticketHolders = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      [Query.equal("eventId", eventId), Query.limit(500)],
    );
    const ownerIds = [...new Set(ticketHolders.documents.map((t) => (t as unknown as { ownerId: string }).ownerId))];
    await Promise.all(
      ownerIds.map((ownerId) =>
        notifyEventCancelled(ownerId, event.title, eventId),
      ),
    );

    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath("/dashboard/events");
    revalidatePath("/events");
    return { eventId };
  } catch {
    return { error: "Failed to cancel event" };
  }
}

/** Unpublish an event (published → draft) — only if no tickets sold */
export async function unpublishEvent(
  eventId: string,
): Promise<EventFormResult> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const event = (await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.EVENTS,
    eventId,
  )) as unknown as EventDoc;

  const admin = await isCurrentUserAdmin();
  if (event.organiserId !== user.$id && !admin) return { error: "Not authorized" };
  if (event.status !== "published") return { error: "Only published events can be unpublished" };

  // Check if tickets have been sold
  const tiers = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TICKET_TIERS, [
    Query.equal("eventId", eventId),
    Query.limit(100),
  ]);
  const totalSold = tiers.documents.reduce(
    (sum, t) => sum + ((t as unknown as { soldCount: number }).soldCount || 0),
    0,
  );
  if (totalSold > 0) {
    return { error: `Cannot unpublish — ${totalSold} tickets already sold. Cancel the event instead.` };
  }

  try {
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.EVENTS, eventId, {
      status: "draft",
    });

    await databases.createDocument(DATABASE_ID, COLLECTIONS.AUDIT_LOGS, ID.unique(), {
      actorId: user.$id,
      action: "event.unpublished",
      entityType: "event",
      entityId: eventId,
      metadata: JSON.stringify({ title: event.title }),
    });

    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath("/dashboard/events");
    revalidatePath("/events");
    return { eventId };
  } catch {
    return { error: "Failed to unpublish event" };
  }
}

/** Get events owned by the current organiser (admins see all) */
export async function getOrganiserEvents(): Promise<EventWithVenue[]> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return [];

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();
  const admin = await isCurrentUserAdmin();

  const queries = admin
    ? [Query.orderDesc("$createdAt"), Query.limit(100)]
    : [Query.equal("organiserId", user.$id), Query.orderDesc("$createdAt"), Query.limit(50)];

  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.EVENTS, queries);

  const events = result.documents as unknown as EventDoc[];

  // Fetch venues
  const venueIds = [...new Set(events.map((e) => e.venueId))];
  const venueMap = new Map<string, VenueDoc>();
  if (venueIds.length > 0) {
    const venues = await Promise.all(
      venueIds.map((id) =>
        databases.getDocument(DATABASE_ID, COLLECTIONS.VENUES, id).catch(() => null),
      ),
    );
    for (const v of venues) {
      if (v) venueMap.set(v.$id, v as unknown as VenueDoc);
    }
  }

  return events.map((event) => ({
    ...event,
    venue: venueMap.get(event.venueId) ?? null,
  }));
}

// ─── Helpers ───────────────────────────────────────

function getDateRangeEnd(
  range: "today" | "weekend" | "week" | "month",
): string | null {
  const now = new Date();

  switch (range) {
    case "today": {
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return end.toISOString();
    }
    case "weekend": {
      const dayOfWeek = now.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      const end = new Date(now);
      end.setDate(now.getDate() + daysUntilSunday);
      end.setHours(23, 59, 59, 999);
      return end.toISOString();
    }
    case "week": {
      const end = new Date(now);
      end.setDate(now.getDate() + 7);
      end.setHours(23, 59, 59, 999);
      return end.toISOString();
    }
    case "month": {
      const end = new Date(now);
      end.setMonth(now.getMonth() + 1);
      end.setHours(23, 59, 59, 999);
      return end.toISOString();
    }
    default:
      return null;
  }
}
