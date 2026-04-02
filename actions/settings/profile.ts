"use server";

import { Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS, BUCKETS } from "@/lib/appwrite/config";
import { sanitizeName, sanitizeText } from "@/lib/security/sanitize";
import { checkProfileRateLimit, checkAvatarRateLimit } from "@/lib/security/rate-limit";
import { createAuditLog } from "@/lib/audit";
import type { ProfileDoc } from "@/lib/appwrite/types";

const generalProfileSchema = z.object({
  displayName: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
  artistGenres: z.array(z.string().max(50)).max(10).optional(),
  socialLinks: z.array(z.string().max(200)).max(5).optional(),
  portfolioUrls: z.array(z.string().max(200)).max(10).optional(),
});

export type SettingsResult = { error?: string; success?: boolean };

/** Update general profile fields with sanitization and audit logging */
export async function updateGeneralProfile(
  input: z.infer<typeof generalProfileSchema>,
): Promise<SettingsResult> {
  const parsed = generalProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();

  // Rate limit
  const rateCheck = await checkProfileRateLimit(user.$id);
  if (!rateCheck.allowed) {
    return { error: `Too many updates. Try again in ${Math.ceil(rateCheck.retryAfterMs / 1000)}s` };
  }

  const { databases } = await createAdminClient();

  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", user.$id), Query.limit(1)],
  );

  if (documents.length === 0) return { error: "Profile not found" };
  const profile = documents[0] as unknown as ProfileDoc;

  // Sanitize inputs
  const updates: Record<string, unknown> = {};
  const changedFields: string[] = [];

  const sanitizedName = sanitizeName(parsed.data.displayName);
  if (sanitizedName !== profile.displayName) {
    updates.displayName = sanitizedName;
    changedFields.push("displayName");
  }

  if (parsed.data.phone !== undefined && parsed.data.phone !== profile.phone) {
    updates.phone = parsed.data.phone || null;
    changedFields.push("phone");
  }

  if (parsed.data.bio !== undefined) {
    const sanitizedBio = parsed.data.bio ? sanitizeText(parsed.data.bio) : null;
    if (sanitizedBio !== profile.bio) {
      updates.bio = sanitizedBio;
      changedFields.push("bio");
    }
  }

  if (parsed.data.timezone !== undefined && parsed.data.timezone !== profile.timezone) {
    updates.timezone = parsed.data.timezone || null;
    changedFields.push("timezone");
  }

  if (parsed.data.language !== undefined && parsed.data.language !== profile.language) {
    updates.language = parsed.data.language || null;
    changedFields.push("language");
  }

  if (parsed.data.artistGenres !== undefined) {
    updates.artistGenres = parsed.data.artistGenres;
    changedFields.push("artistGenres");
  }

  if (parsed.data.socialLinks !== undefined) {
    updates.socialLinks = parsed.data.socialLinks;
    changedFields.push("socialLinks");
  }

  if (parsed.data.portfolioUrls !== undefined) {
    updates.portfolioUrls = parsed.data.portfolioUrls;
    changedFields.push("portfolioUrls");
  }

  if (changedFields.length === 0) return { success: true };

  try {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      profile.$id,
      updates,
    );

    await createAuditLog({
      actorId: user.$id,
      action: "profile.general_updated",
      entityType: "profile",
      entityId: profile.$id,
      metadata: { changedFields },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { error: "Failed to update profile" };
  }
}

const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2MB
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Upload a new avatar image */
export async function uploadAvatar(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();

  const rateCheck = await checkAvatarRateLimit(user.$id);
  if (!rateCheck.allowed) return { error: "Too many uploads. Try again later." };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };
  if (!AVATAR_TYPES.includes(file.type)) return { error: "Only JPEG, PNG, and WebP are allowed" };
  if (file.size > AVATAR_MAX_SIZE) return { error: "File must be under 2MB" };

  const { databases, storage } = await createAdminClient();

  // Find profile
  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", user.$id), Query.limit(1)],
  );
  if (documents.length === 0) return { error: "Profile not found" };
  const profile = documents[0] as unknown as ProfileDoc;

  try {
    // Delete old avatar if exists
    if (profile.photoUrl) {
      const oldFileId = extractFileIdFromUrl(profile.photoUrl);
      if (oldFileId) {
        await storage.deleteFile(BUCKETS.PROFILE_AVATARS, oldFileId).catch(() => {});
      }
    }

    // Upload new
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileId = `${user.$id}-${Date.now()}`;

    const result = await storage.createFile(
      BUCKETS.PROFILE_AVATARS,
      fileId,
      InputFile.fromBuffer(buffer, file.name),
    );

    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT!;
    const url = `${endpoint}/storage/buckets/${BUCKETS.PROFILE_AVATARS}/files/${result.$id}/view?project=${projectId}`;

    await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, profile.$id, {
      photoUrl: url,
    });

    await createAuditLog({
      actorId: user.$id,
      action: "profile.avatar_uploaded",
      entityType: "profile",
      entityId: profile.$id,
    });

    revalidatePath("/dashboard/settings");
    return { url };
  } catch {
    return { error: "Failed to upload avatar" };
  }
}

/** Delete the current avatar */
export async function deleteAvatar(): Promise<SettingsResult> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases, storage } = await createAdminClient();

  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", user.$id), Query.limit(1)],
  );
  if (documents.length === 0) return { error: "Profile not found" };
  const profile = documents[0] as unknown as ProfileDoc;

  if (!profile.photoUrl) return { success: true };

  try {
    const fileId = extractFileIdFromUrl(profile.photoUrl);
    if (fileId) {
      await storage.deleteFile(BUCKETS.PROFILE_AVATARS, fileId).catch(() => {});
    }

    await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, profile.$id, {
      photoUrl: null,
    });

    await createAuditLog({
      actorId: user.$id,
      action: "profile.avatar_deleted",
      entityType: "profile",
      entityId: profile.$id,
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { error: "Failed to delete avatar" };
  }
}

/** Extract file ID from Appwrite storage URL */
function extractFileIdFromUrl(url: string): string | null {
  const match = url.match(/\/files\/([^/]+)\/view/);
  return match?.[1] ?? null;
}
