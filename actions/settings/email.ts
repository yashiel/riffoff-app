"use server";

import { z } from "zod/v4";
import { createSessionClient } from "@/lib/appwrite/server";
import { checkSensitiveRateLimit } from "@/lib/security/rate-limit";
import { createAuditLog } from "@/lib/audit";

const emailChangeSchema = z.object({
  newEmail: z.email(),
  password: z.string().min(8),
});

/** Request an email address change (requires password confirmation) */
export async function requestEmailChange(
  input: z.infer<typeof emailChangeSchema>,
): Promise<{ error?: string; success?: boolean }> {
  const parsed = emailChangeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();

  const rateCheck = checkSensitiveRateLimit(user.$id);
  if (!rateCheck.allowed) return { error: "Too many attempts. Try again later." };

  if (parsed.data.newEmail === user.email) {
    return { error: "New email is the same as your current email" };
  }

  try {
    await sessionClient.account.updateEmail(
      parsed.data.newEmail,
      parsed.data.password,
    );

    await createAuditLog({
      actorId: user.$id,
      action: "profile.email_change_requested",
      entityType: "user",
      entityId: user.$id,
      metadata: { newEmail: parsed.data.newEmail },
    });

    return { success: true };
  } catch {
    return { error: "Failed to change email. Check your password." };
  }
}
