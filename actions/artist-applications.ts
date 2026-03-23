"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { notifyApplicationSubmitted } from "@/actions/notifications";
import { getProfileByUserId } from "@/actions/profiles";
import type { ApplicationDoc, EventDoc, VenueDoc } from "@/lib/appwrite/types";

// ─── Types ───────────────────────────────────────────

export interface ArtistApplicationWithEvent extends ApplicationDoc {
  event: EventDoc | null;
  venue: VenueDoc | null;
}

// ─── Apply to Event ──────────────────────────────────

const applySchema = z.object({
  eventId: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export type ApplyResult = { error?: string; applicationId?: string };

/** Artist applies to perform at an event */
export async function applyToEvent(
  input: z.infer<typeof applySchema>,
): Promise<ApplyResult> {
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  // Verify event exists and is published
  let event: EventDoc;
  try {
    event = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      parsed.data.eventId,
    )) as unknown as EventDoc;
  } catch {
    return { error: "Event not found" };
  }

  if (event.status !== "published") {
    return { error: "Can only apply to published events" };
  }

  // Can't apply to own event
  if (event.organiserId === user.$id) {
    return { error: "Cannot apply to your own event" };
  }

  // Check for existing application
  const existing = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.APPLICATIONS,
    [
      Query.equal("eventId", parsed.data.eventId),
      Query.equal("artistId", user.$id),
      Query.limit(1),
    ],
  );

  if (existing.total > 0) {
    const existingApp = existing.documents[0] as unknown as ApplicationDoc;
    if (existingApp.status !== "withdrawn") {
      return { error: "You have already applied to this event" };
    }
  }

  try {
    const application = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.APPLICATIONS,
      ID.unique(),
      {
        eventId: parsed.data.eventId,
        artistId: user.$id,
        status: "submitted",
        submittedAt: new Date().toISOString(),
        notes: parsed.data.notes ?? null,
        messageThreadId: null,
      },
    );

    // Audit log
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.AUDIT_LOGS,
      ID.unique(),
      {
        actorId: user.$id,
        action: "application.submitted",
        entityType: "application",
        entityId: application.$id,
        metadata: JSON.stringify({ eventId: parsed.data.eventId, eventTitle: event.title }),
      },
    );

    // Notify the event organiser
    const artistProfile = await getProfileByUserId(user.$id);
    await notifyApplicationSubmitted(
      event.organiserId,
      artistProfile?.displayName ?? "An artist",
      event.title,
      event.$id,
    );

    revalidatePath("/dashboard/applications");
    return { applicationId: application.$id };
  } catch {
    return { error: "Failed to submit application" };
  }
}

// ─── Withdraw Application ────────────────────────────

/** Artist withdraws their application */
export async function withdrawApplication(
  applicationId: string,
): Promise<{ error?: string }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const application = (await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.APPLICATIONS,
    applicationId,
  )) as unknown as ApplicationDoc;

  // Verify ownership
  if (application.artistId !== user.$id) return { error: "Not authorized" };

  // Can only withdraw submitted or shortlisted
  if (application.status !== "submitted" && application.status !== "shortlisted") {
    return { error: `Cannot withdraw a "${application.status}" application` };
  }

  try {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.APPLICATIONS,
      applicationId,
      { status: "withdrawn" },
    );

    revalidatePath("/dashboard/applications");
    return {};
  } catch {
    return { error: "Failed to withdraw application" };
  }
}

// ─── List My Applications ────────────────────────────

/** Get all applications for the current artist */
export async function getMyApplications(): Promise<ArtistApplicationWithEvent[]> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return [];

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.APPLICATIONS,
    [
      Query.equal("artistId", user.$id),
      Query.orderDesc("submittedAt"),
      Query.limit(50),
    ],
  );

  const applications = result.documents as unknown as ApplicationDoc[];
  if (applications.length === 0) return [];

  // Fetch events
  const eventIds = [...new Set(applications.map((a) => a.eventId))];
  const eventMap = new Map<string, EventDoc>();
  const venueMap = new Map<string, VenueDoc>();

  const events = await Promise.all(
    eventIds.map((id) =>
      databases.getDocument(DATABASE_ID, COLLECTIONS.EVENTS, id).catch(() => null),
    ),
  );

  for (const e of events) {
    if (e) eventMap.set(e.$id, e as unknown as EventDoc);
  }

  // Fetch venues for events
  const venueIds = [...new Set([...eventMap.values()].map((e) => e.venueId).filter(Boolean))];
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

  return applications.map((app) => {
    const event = eventMap.get(app.eventId) ?? null;
    return {
      ...app,
      event,
      venue: event ? venueMap.get(event.venueId) ?? null : null,
    };
  });
}
