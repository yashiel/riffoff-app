import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS, BUCKETS } from "@/lib/appwrite/config";
import type { MessageDoc, ApplicationDoc, EventDoc } from "@/lib/appwrite/types";

interface RouteContext {
  params: Promise<{ fileId: string }>;
}

/**
 * Authenticated proxy for conversation message attachments.
 *
 * Files are uploaded with empty permissions (server-only access). This
 * route verifies the requesting user is a participant in the thread that
 * owns the file, then streams the bytes back through the admin client.
 *
 * Without this proxy, the direct Appwrite view URL would 404 for
 * anonymous browser requests.
 */
export async function GET(_request: NextRequest, ctx: RouteContext) {
  const { fileId } = await ctx.params;

  if (!fileId || !/^[a-zA-Z0-9]{1,36}$/.test(fileId)) {
    return NextResponse.json({ error: "Invalid file id" }, { status: 400 });
  }

  // Authenticate the requester
  const sessionClient = await createSessionClient();
  if (!sessionClient) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  let user;
  try {
    user = await sessionClient.account.get();
  } catch {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { databases, storage } = await createAdminClient();

  // Find the message that owns this attachment.
  // We can't query "endsWith" on Appwrite, so we search on the substring "/files/{fileId}/" instead.
  const lookup = await databases
    .listDocuments(DATABASE_ID, COLLECTIONS.MESSAGES, [
      Query.contains("attachmentUrl", fileId),
      Query.limit(1),
    ])
    .catch(() => ({ documents: [] }));

  const message = lookup.documents[0] as unknown as MessageDoc | undefined;
  if (!message) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify the user is a participant of the thread (artist or event organiser)
  if (message.threadType !== "application") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const application = await databases
    .getDocument(DATABASE_ID, COLLECTIONS.APPLICATIONS, message.threadId)
    .catch(() => null) as unknown as ApplicationDoc | null;
  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let allowed = application.artistId === user.$id;
  if (!allowed) {
    const event = await databases
      .getDocument(DATABASE_ID, COLLECTIONS.EVENTS, application.eventId)
      .catch(() => null) as unknown as EventDoc | null;
    if (event && event.organiserId === user.$id) {
      allowed = true;
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Stream the file from Appwrite storage
  let buffer: ArrayBuffer;
  let metadata: { name: string; mimeType: string };
  try {
    const file = await storage.getFile(BUCKETS.ARTIST_RIDERS, fileId);
    metadata = { name: file.name, mimeType: file.mimeType ?? "application/octet-stream" };
    buffer = await storage.getFileView(BUCKETS.ARTIST_RIDERS, fileId);
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Use inline disposition for images/PDFs, attachment for others
  const inlineTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
  ];
  const disposition = inlineTypes.includes(metadata.mimeType)
    ? `inline; filename="${metadata.name.replace(/"/g, "")}"`
    : `attachment; filename="${metadata.name.replace(/"/g, "")}"`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": metadata.mimeType,
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=300",
    },
  });
}
