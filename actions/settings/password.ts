"use server";

import { z } from "zod/v4";
import { createSessionClient } from "@/lib/appwrite/server";
import { checkSensitiveRateLimit } from "@/lib/security/rate-limit";
import { createAuditLog } from "@/lib/audit";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(128),
});

export type PasswordResult = { error?: string; success?: boolean };

/** Change the current user's password */
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

  // Rate limit — sensitive operation
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
