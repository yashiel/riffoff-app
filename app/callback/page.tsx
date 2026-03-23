import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/appwrite/server";
import { SESSION_COOKIE_NAME } from "@/lib/appwrite/config";
import { ensureProfile } from "@/actions/profiles";

/**
 * OAuth callback handler.
 *
 * Flow:
 * 1. User clicks "Login with Google/Facebook"
 * 2. Our loginWithProvider() calls account.createOAuth2Token() → redirects to provider
 * 3. Provider authenticates → redirects back to Appwrite
 * 4. Appwrite creates an OAuth2 token → redirects here with userId + secret
 * 5. We exchange the token for a session via account.createSession()
 * 6. Set httpOnly cookie → redirect to dashboard
 */
export default async function CallbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    userId?: string;
    secret?: string;
    redirect?: string;
  }>;
}) {
  const params = await searchParams;
  const { userId, secret } = params;
  const redirectTo = params.redirect || "/dashboard";

  if (!userId || !secret) {
    console.error("[OAUTH CALLBACK] Missing userId or secret in query params");
    redirect("/login?error=missing_params");
  }

  try {
    // Exchange the OAuth2 token for a real session
    const { account } = await createAdminClient();
    const session = await account.createSession(userId, secret);

    // Set session cookie (using the SESSION secret, not the OAuth token)
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session.secret, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Ensure profile document exists for this user
    // Use session.userId (not the raw userId param) for safety
    await ensureProfile(session.userId, undefined);
  } catch (error) {
    console.error("[OAUTH CALLBACK ERROR]", error);
    redirect("/login?error=oauth_failed");
  }

  redirect(redirectTo);
}
