import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite/server";
import { SESSION_COOKIE_NAME } from "@/lib/appwrite/config";
import { ensureProfile } from "@/actions/profiles";

/**
 * OAuth callback Route Handler.
 *
 * Appwrite redirects here after successful OAuth with ?userId=xxx&secret=xxx
 * We exchange the token for a session, set the cookie ON the redirect response,
 * and redirect to dashboard.
 *
 * CRITICAL: Cookie must be set on the NextResponse object (not via cookies() API)
 * so it travels WITH the 302 redirect. Otherwise the browser follows the redirect
 * to /dashboard without the session cookie, causing a brief auth failure flash.
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const secret = request.nextUrl.searchParams.get("secret");

  if (!userId || !secret) {
    console.error("[OAUTH CALLBACK] Missing userId or secret");
    return NextResponse.redirect(
      `${request.nextUrl.origin}/login?error=missing_params`,
    );
  }

  try {
    const { account } = await createAdminClient();

    // Exchange the OAuth2 token for a real session
    const session = await account.createSession(userId, secret);

    // Ensure profile document exists (non-blocking — don't let it break the redirect)
    await ensureProfile(session.userId, undefined).catch((err) => {
      console.error("[OAUTH CALLBACK] ensureProfile failed:", err);
    });

    // Create redirect response and set cookie ON it
    // This ensures the cookie travels with the 302 redirect
    const response = NextResponse.redirect(
      `${request.nextUrl.origin}/dashboard`,
    );

    response.cookies.set(SESSION_COOKIE_NAME, session.secret, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("[OAUTH CALLBACK ERROR]", error);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/login?error=oauth_failed`,
    );
  }
}
