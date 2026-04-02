"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { serialize } from "@/lib/utils";
import type { ProfileDoc, UserRole } from "@/lib/appwrite/types";

/**
 * Get the current user's profile document.
 * Returns null if not authenticated or profile doesn't exist.
 */
export async function getProfile(): Promise<ProfileDoc | null> {
  try {
    const sessionClient = await createSessionClient();
    if (!sessionClient) return null;

    const user = await sessionClient.account.get();
    const { databases } = await createAdminClient();
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      [Query.equal("userId", user.$id), Query.limit(1)],
    );

    const doc = documents[0] as unknown as ProfileDoc | undefined;
    return doc ? serialize(doc) : null;
  } catch (error) {
    console.error("[getProfile] Error:", error);
    return null;
  }
}

/**
 * Ensure a profile document exists for the given user.
 * Creates one if it doesn't exist. Role defaults to "attendee" unless specified.
 * Called on registration and OAuth first-login.
 * SECURITY: role parameter is validated — only "attendee", "artist", "organiser" accepted.
 */
export async function ensureProfile(
  userId: string,
  displayName?: string,
  role?: "attendee" | "artist" | "organiser",
  email?: string,
): Promise<ProfileDoc> {
  const { databases } = await createAdminClient();

  // Check if profile already exists
  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", userId), Query.limit(1)],
  );

  if (documents.length > 0) {
    return serialize(documents[0] as unknown as ProfileDoc);
  }

  // Use email as fallback displayName when no name provided
  const resolvedName = displayName || email || null;

  // Create new profile with default role
  const profile = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    ID.unique(),
    {
      userId,
      displayName: resolvedName,
      photoUrl: null,
      role: (role ?? "attendee") as UserRole,
      phone: null,
      timezone: null,
      language: null,
      deactivatedAt: null,
      bio: null,
      artistGenres: [],
      socialLinks: [],
      portfolioUrls: [],
    },
  );

  return serialize(profile as unknown as ProfileDoc);
}

/**
 * Get a user's profile by their userId.
 * Uses admin client — for server-side lookups (e.g., middleware).
 */
export async function getProfileByUserId(
  userId: string,
): Promise<ProfileDoc | null> {
  try {
    const { databases } = await createAdminClient();
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      [Query.equal("userId", userId), Query.limit(1)],
    );

    const doc = documents[0] as unknown as ProfileDoc | undefined;
    return doc ? serialize(doc) : null;
  } catch {
    return null;
  }
}

// ─── Artist Profile Actions ──────────────────────────────

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  bio: z.string().max(500).optional(),
  artistGenres: z.array(z.string().max(50)).max(10).optional(),
  socialLinks: z.array(z.string().url().max(200)).max(5).optional(),
  portfolioUrls: z.array(z.string().url().max(200)).max(10).optional(),
  photoUrl: z.string().optional(),
});

export type ProfileUpdateResult = { error?: string; profile?: ProfileDoc };

/** Update the current user's profile */
export async function updateProfile(
  input: z.infer<typeof updateProfileSchema>,
): Promise<ProfileUpdateResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", user.$id), Query.limit(1)],
  );

  if (documents.length === 0) return { error: "Profile not found" };

  const profileId = documents[0].$id;

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) updates[key] = value;
  }

  if (Object.keys(updates).length === 0) return { profile: documents[0] as unknown as ProfileDoc };

  try {
    const updated = (await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      profileId,
      updates,
    )) as unknown as ProfileDoc;

    revalidatePath("/dashboard/profile");
    return { profile: serialize(updated) };
  } catch {
    return { error: "Failed to update profile" };
  }
}

/** Upgrade a user's role (attendee → artist or organiser) */
export async function upgradeRole(
  newRole: "artist" | "organiser",
): Promise<ProfileUpdateResult> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", user.$id), Query.limit(1)],
  );

  if (documents.length === 0) return { error: "Profile not found" };

  const profile = documents[0] as unknown as ProfileDoc;

  if (profile.role !== "attendee" && profile.role !== newRole) {
    return { error: `Cannot change role from "${profile.role}" to "${newRole}"` };
  }

  try {
    const updated = (await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      profile.$id,
      { role: newRole },
    )) as unknown as ProfileDoc;

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/profile");
    return { profile: serialize(updated) };
  } catch {
    return { error: "Failed to upgrade role" };
  }
}
