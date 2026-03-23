"use server";

import { z } from "zod/v4";
import { createSessionClient } from "@/lib/appwrite/server";
import { checkSensitiveRateLimit } from "@/lib/security/rate-limit";
import { createAuditLog } from "@/lib/audit";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(128),
});

const setPasswordSchema = z.object({
  newPassword: z.string().min(8).max(128),
});

export type PasswordResult = { error?: string; success?: boolean };

/** Check if the current user has a password set (vs OAuth-only) */
export async function hasPasswordSet(): Promise<boolean> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return false;

  try {
    const user = await sessionClient.account.get();
    // Appwrite returns empty string for passwordUpdate if no password was ever set
    return user.passwordUpdate !== "";
  } catch {
    return false;
  }
}

/** Change password (for users who already have one) */
export async function changePassword(
  input: z.infer<typeof changePasswordSchema>,
): Promise<PasswordResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();

  const rateCheck = checkSensitiveRateLimit(user.$id);
  if (!rateCheck.allowed) {
    return { error: `Too many attempts. Try again in ${Math.ceil(rateCheck.retryAfterMs / 60000)} minutes` };
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return { error: "New password must be different from current password" };
  }

  try {
    await sessionClient.account.updatePassword(
      parsed.data.newPassword,
      parsed.data.currentPassword,
    );

    await createAuditLog({
      actorId: user.$id,
      action: "profile.password_changed",
      entityType: "user",
      entityId: user.$id,
    });

    return { success: true };
  } catch {
    return { error: "Incorrect current password" };
  }
}

/** Set a password for the first time (OAuth-only users) */
export async function setPassword(
  input: z.infer<typeof setPasswordSchema>,
): Promise<PasswordResult> {
  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();

  const rateCheck = checkSensitiveRateLimit(user.$id);
  if (!rateCheck.allowed) {
    return { error: `Too many attempts. Try again in ${Math.ceil(rateCheck.retryAfterMs / 60000)} minutes` };
  }

  // Only allow if user doesn't have a password yet
  if (user.passwordUpdate !== "") {
    return { error: "You already have a password. Use 'Change Password' instead." };
  }

  try {
    // Appwrite allows setting password without old password if none exists
    await sessionClient.account.updatePassword(parsed.data.newPassword);

    await createAuditLog({
      actorId: user.$id,
      action: "profile.password_set",
      entityType: "user",
      entityId: user.$id,
    });

    return { success: true };
  } catch {
    return { error: "Failed to set password" };
  }
}
