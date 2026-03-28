"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS, BUCKETS } from "@/lib/appwrite/config";
import { isCurrentUserAdmin } from "@/lib/auth-utils";
import { serialize } from "@/lib/utils";
import { InputFile } from "node-appwrite/file";
import type {
  MessageDoc,
  ApplicationDoc,
  EventDoc,
  ProfileDoc,
} from "@/lib/appwrite/types";

// ─── Constants ──────────────────────────────────────

const MAX_BODY_LENGTH = 2000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// ─── Participant Verification ───────────────────────

interface Participant {
  userId: string;
  role: "artist" | "organiser";
}

/**
 * Verify the current user is a participant of the application thread.
 * The artist who applied OR the organiser who owns the event can participate.
 */
async function verifyParticipant(
  applicationId: string,
): Promise<Participant | null> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return null;

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  let application: ApplicationDoc;
  try {
    application = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.APPLICATIONS,
      applicationId,
    )) as unknown as ApplicationDoc;
  } catch {
    return null;
  }

  // Check if user is the artist
  if (application.artistId === user.$id) {
    return { userId: user.$id, role: "artist" };
  }

  // Check if user is the event organiser
  let event: EventDoc;
  try {
    event = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      application.eventId,
    )) as unknown as EventDoc;
  } catch {
    return null;
  }

  if (event.organiserId === user.$id) {
    return { userId: user.$id, role: "organiser" };
  }

  // Check if user is admin
  const isAdmin = await isCurrentUserAdmin();
  if (isAdmin) {
    return { userId: user.$id, role: "organiser" };
  }

  return null;
}

// ─── Get Thread Messages ────────────────────────────

/** Fetch messages for an application thread */
export async function getThreadMessages(
  applicationId: string,
  limit = 50,
  offset = 0,
): Promise<MessageDoc[]> {
  const participant = await verifyParticipant(applicationId);
  if (!participant) return [];

  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.MESSAGES,
    [
      Query.equal("threadType", "application"),
      Query.equal("threadId", applicationId),
      Query.orderAsc("$createdAt"),
      Query.limit(limit),
      Query.offset(offset),
    ],
  );

  return serialize(result.documents as unknown as MessageDoc[]);
}

// ─── Send Message ───────────────────────────────────

/** Send a text message in an application thread */
export async function sendMessage(
  applicationId: string,
  body: string,
): Promise<MessageDoc | null> {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > MAX_BODY_LENGTH) return null;

  const participant = await verifyParticipant(applicationId);
  if (!participant) return null;

  const { databases } = await createAdminClient();

  try {
    const message = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.MESSAGES,
      ID.unique(),
      {
        threadType: "application",
        threadId: applicationId,
        senderId: participant.userId,
        body: trimmed,
        attachmentUrl: null,
      },
    );

    revalidatePath(`/dashboard/applications/${applicationId}`);
    revalidatePath(`/dashboard/events`);

    return serialize(message as unknown as MessageDoc);
  } catch {
    return null;
  }
}

// ─── Send Message With Attachment ───────────────────

/** Send a message with a file attachment in an application thread */
export async function sendMessageWithAttachment(
  applicationId: string,
  body: string,
  formData: FormData,
): Promise<MessageDoc | null> {
  const trimmed = body.trim();
  if (trimmed.length > MAX_BODY_LENGTH) return null;

  const participant = await verifyParticipant(applicationId);
  if (!participant) return null;

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return null;

  // Validate file size
  if (file.size > MAX_FILE_SIZE) return null;

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return null;

  const { databases, storage } = await createAdminClient();

  try {
    // Upload file to Appwrite storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const inputFile = InputFile.fromBuffer(buffer, file.name);

    const uploaded = await storage.createFile(
      BUCKETS.ARTIST_RIDERS,
      ID.unique(),
      inputFile,
    );

    const attachmentUrl = `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${BUCKETS.ARTIST_RIDERS}/files/${uploaded.$id}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`;

    const message = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.MESSAGES,
      ID.unique(),
      {
        threadType: "application",
        threadId: applicationId,
        senderId: participant.userId,
        body: trimmed || "Sent an attachment",
        attachmentUrl,
      },
    );

    revalidatePath(`/dashboard/applications/${applicationId}`);
    revalidatePath(`/dashboard/events`);

    return serialize(message as unknown as MessageDoc);
  } catch {
    return null;
  }
}

// ─── Get Thread Participants ────────────────────────

export interface ThreadParticipants {
  artistId: string;
  organiserId: string;
  artistName: string;
  organiserName: string;
}

/** Get participant info for an application thread */
export async function getThreadParticipants(
  applicationId: string,
): Promise<ThreadParticipants | null> {
  const participant = await verifyParticipant(applicationId);
  if (!participant) return null;

  const { databases } = await createAdminClient();

  let application: ApplicationDoc;
  try {
    application = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.APPLICATIONS,
      applicationId,
    )) as unknown as ApplicationDoc;
  } catch {
    return null;
  }

  let event: EventDoc;
  try {
    event = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      application.eventId,
    )) as unknown as EventDoc;
  } catch {
    return null;
  }

  // Fetch profiles for both participants
  const [artistProfiles, organiserProfiles] = await Promise.all([
    databases
      .listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
        Query.equal("userId", application.artistId),
        Query.limit(1),
      ])
      .catch(() => ({ documents: [] })),
    databases
      .listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
        Query.equal("userId", event.organiserId),
        Query.limit(1),
      ])
      .catch(() => ({ documents: [] })),
  ]);

  const artistProfile = artistProfiles.documents[0] as unknown as ProfileDoc | undefined;
  const organiserProfile = organiserProfiles.documents[0] as unknown as ProfileDoc | undefined;

  return {
    artistId: application.artistId,
    organiserId: event.organiserId,
    artistName: artistProfile?.displayName ?? "Artist",
    organiserName: organiserProfile?.displayName ?? "Organiser",
  };
}
