"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { isCurrentUserAdmin } from "@/lib/auth-utils";
import { notifyApplicationStatusChanged } from "@/actions/notifications";
import { sendApplicationStatusEmail } from "@/lib/email";
import { serialize } from "@/lib/utils";
import { ORGANISER_DECISIONS } from "@/lib/applications/status-meta";
import type {
  ApplicationDoc,
  ApplicationStatus,
  EventDoc,
  ProfileDoc,
} from "@/lib/appwrite/types";

export interface ApplicationWithArtist extends ApplicationDoc {
  artist: ProfileDoc | null;
}

/** Get applications for an event (organiser view) */
export async function getEventApplications(
  eventId: string,
): Promise<ApplicationWithArtist[]> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return [];

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  // Verify organiser owns this event
  const event = (await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.EVENTS,
    eventId,
  )) as unknown as EventDoc;

  const adminApps = await isCurrentUserAdmin();
  if (event.organiserId !== user.$id && !adminApps) return [];

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.APPLICATIONS,
    [
      Query.equal("eventId", eventId),
      Query.orderDesc("submittedAt"),
      Query.limit(100),
    ],
  );

  const applications = result.documents as unknown as ApplicationDoc[];

  // Fetch artist profiles
  const artistIds = [...new Set(applications.map((a) => a.artistId))];
  const profileMap = new Map<string, ProfileDoc>();

  if (artistIds.length > 0) {
    const profiles = await Promise.all(
      artistIds.map((id) =>
        databases
          .listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
            Query.equal("userId", id),
            Query.limit(1),
          ])
          .then((r) => (r.documents[0] as unknown as ProfileDoc) ?? null)
          .catch(() => null),
      ),
    );
    for (const p of profiles) {
      if (p) profileMap.set(p.userId, p);
    }
  }

  return serialize(applications.map((app) => ({
    ...app,
    artist: profileMap.get(app.artistId) ?? null,
  })));
}

/** Update application status (organiser action — reversible) */
export async function updateApplicationStatus(
  applicationId: string,
  newStatus: ApplicationStatus,
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

  // Verify organiser owns the event
  const event = (await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.EVENTS,
    application.eventId,
  )) as unknown as EventDoc;

  const adminStatus = await isCurrentUserAdmin();
  if (event.organiserId !== user.$id && !adminStatus) return { error: "Not authorized" };

  // Validate the request
  if (!ORGANISER_DECISIONS.includes(newStatus)) {
    return { error: `"${newStatus}" is not an organiser-changeable status` };
  }
  if (application.status === "withdrawn") {
    return { error: "The artist has withdrawn this application — it cannot be changed" };
  }
  if (application.status === newStatus) {
    return {}; // no-op — already there
  }

  try {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.APPLICATIONS,
      applicationId,
      { status: newStatus },
    );

    // Audit log
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.AUDIT_LOGS,
      ID.unique(),
      {
        actorId: user.$id,
        action: `application.${newStatus}`,
        entityType: "application",
        entityId: applicationId,
        metadata: JSON.stringify({
          eventId: application.eventId,
          artistId: application.artistId,
          previousStatus: application.status,
        }),
      },
    );

    // Notify the artist
    if (newStatus === "accepted" || newStatus === "rejected" || newStatus === "shortlisted") {
      await notifyApplicationStatusChanged(
        application.artistId,
        event.title,
        application.eventId,
        newStatus,
      );

      // Send email (non-blocking)
      try {
        const { users } = await createAdminClient();
        const artistUser = await users.get(application.artistId);
        if (artistUser.email) {
          void sendApplicationStatusEmail(artistUser.email, {
            userName: artistUser.name || "",
            eventTitle: event.title,
            status: newStatus,
          });
        }
      } catch {
        // Non-critical
      }
    }

    revalidatePath(`/dashboard/events/${application.eventId}/applications`);
    revalidatePath(`/dashboard/events/${application.eventId}/applications/${applicationId}`);
    revalidatePath(`/events/${application.eventId}`);
    revalidatePath("/dashboard/applications");
    return {};
  } catch {
    return { error: "Failed to update application status" };
  }
}
