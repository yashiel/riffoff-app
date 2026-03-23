"use server";

import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { BUCKETS } from "@/lib/appwrite/config";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Upload an event cover image to Appwrite Storage */
export async function uploadEventImage(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Only JPEG, PNG, and WebP images are allowed" };
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return { error: "File must be under 5MB" };
  }

  try {
    const { storage } = await createAdminClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await storage.createFile(
      BUCKETS.EVENT_MEDIA,
      ID.unique(),
      InputFile.fromBuffer(buffer, file.name),
    );

    // Construct the file URL
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT!;
    const url = `${endpoint}/storage/buckets/${BUCKETS.EVENT_MEDIA}/files/${result.$id}/view?project=${projectId}`;

    return { url };
  } catch {
    return { error: "Failed to upload image" };
  }
}
