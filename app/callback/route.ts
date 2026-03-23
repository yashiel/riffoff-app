import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/appwrite/server";
import { SESSION_COOKIE_NAME } from "@/lib/appwrite/config";
import { ensureProfile } from "@/actions/profiles";

/**
 * OAuth callback Route Handler.
 *
 * Appwrite redirects here after successful OAuth with ?userId=xxx&secret=xxx
 * We exchange the token for a session, set the cookie, and redirect to dashboard.
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

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session.secret, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Ensure profile document exists
    await ensureProfile(session.userId, undefined).catch((err) => {
      console.error("[OAUTH CALLBACK] ensureProfile failed:", err);
    });

    return NextResponse.redirect(`${request.nextUrl.origin}/dashboard`);
  } catch (error) {
    console.error("[OAUTH CALLBACK ERROR]", error);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/login?error=oauth_failed`,
    );
  }
}
