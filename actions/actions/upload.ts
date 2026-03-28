"use server";

import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { BUCKETS } from "@/lib/appwrite/config";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

/** Map of MIME types to expected magic byte signatures */
const MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number }[]> = {
  "image/jpeg": [{ bytes: [0xFF, 0xD8, 0xFF] }],
  "image/png": [{ bytes: [0x89, 0x50, 0x4E, 0x47] }],
  "image/webp": [
    { bytes: [0x52, 0x49, 0x46, 0x46] },           // RIFF at offset 0
    { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }, // WEBP at offset 8
  ],
  "image/gif": [{ bytes: [0x47, 0x49, 0x46] }],
};

/** Map of validated MIME type to safe file extension */
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Validate file magic bytes match the claimed MIME type */
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return false;

  for (const sig of signatures) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) return false;
    const matches = sig.bytes.every((byte, i) => buffer[offset + i] === byte);
    if (!matches) return false;
  }
  return true;
}

/** Upload an event cover image to Appwrite Storage */
export async function uploadEventImage(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };

  // Validate MIME type against allowlist
  if (!ALLOWED_TYPES.includes(file.type as typeof ALLOWED_TYPES[number])) {
    return { error: "Only JPEG, PNG, WebP, and GIF images are allowed" };
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return { error: "File must be under 5MB" };
  }

  try {
    const { storage } = await createAdminClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // M-8: Validate magic bytes match the claimed MIME type
    if (!validateMagicBytes(buffer, file.type)) {
      return { error: "File content does not match its declared type" };
    }

    // M-9: Generate safe UUID filename instead of using user-supplied name
    const extension = MIME_TO_EXT[file.type] ?? "bin";
    const safeFilename = `${ID.unique()}.${extension}`;

    const result = await storage.createFile(
      BUCKETS.EVENT_MEDIA,
      ID.unique(),
      InputFile.fromBuffer(buffer, safeFilename),
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
