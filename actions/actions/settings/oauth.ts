"use server";

import { OAuthProvider } from "node-appwrite";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { checkSensitiveRateLimit } from "@/lib/security/rate-limit";
import { createAuditLog } from "@/lib/audit";

export interface LinkedProvider {
  id: string;
  provider: string;
  providerEmail: string;
  createdAt: string;
}

/** Get all linked OAuth providers for the current user */
export async function getLinkedProviders(): Promise<LinkedProvider[]> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return [];

  try {
    const identities = await sessionClient.account.listIdentities();
    return identities.identities.map((identity) => ({
      id: identity.$id,
      provider: identity.provider,
      providerEmail: identity.providerEmail || "—",
      createdAt: identity.$createdAt,
    }));
  } catch {
    return [];
  }
}

/** Unlink an OAuth provider (blocks if it's the last auth method) */
export async function unlinkProvider(
  identityId: string,
): Promise<{ error?: string; success?: boolean }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();

  const rateCheck = checkSensitiveRateLimit(user.$id);
  if (!rateCheck.allowed) return { error: "Too many attempts. Try again later." };

  // Check user has at least 2 auth methods (password counts as one, each provider as one)
  const identities = await sessionClient.account.listIdentities();
  const hasPassword = user.passwordUpdate !== ""; // Has set a password
  const providerCount = identities.identities.length;
  const totalAuthMethods = (hasPassword ? 1 : 0) + providerCount;

  if (totalAuthMethods <= 1) {
    return { error: "Cannot unlink — this is your only sign-in method. Set a password first." };
  }

  const target = identities.identities.find((i) => i.$id === identityId);
  if (!target) return { error: "Provider not found" };

  try {
    await sessionClient.account.deleteIdentity(identityId);

    await createAuditLog({
      actorId: user.$id,
      action: "profile.provider_unlinked",
      entityType: "identity",
      entityId: identityId,
      metadata: { provider: target.provider },
    });

    return { success: true };
  } catch {
    return { error: "Failed to unlink provider" };
  }
}

/** Start OAuth linking flow — redirects to provider */
export async function linkProvider(
  provider: "google" | "facebook",
): Promise<void> {
  const { account } = await createAdminClient();
  const headerStore = await headers();
  const origin = headerStore.get("origin") || process.env.NEXT_PUBLIC_APP_URL;

  const oauthProvider =
    provider === "google" ? OAuthProvider.Google : OAuthProvider.Facebook;

  const redirectUrl = await account.createOAuth2Token(
    oauthProvider,
    `${origin}/callback?redirect=/dashboard/settings?tab=connected`,
    `${origin}/dashboard/settings?tab=connected`,
  );

  redirect(redirectUrl);
}
