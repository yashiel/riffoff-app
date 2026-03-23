import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite/server";
import { SESSION_COOKIE_NAME } from "@/lib/appwrite/config";
import { ensureProfile } from "@/actions/profiles";

/**
 * OAuth callback Route Handler.
 *
 * After OAuth, Appwrite redirects here with ?userId=xxx&secret=xxx.
 * We exchange the token for a session, set the cookie, then return an HTML page
 * that redirects client-side. This avoids the 302-redirect-before-cookie-propagates
 * race condition with Next.js middleware.
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const secret = request.nextUrl.searchParams.get("secret");
  const origin = request.nextUrl.origin;

  if (!userId || !secret) {
    return NextResponse.redirect(`${origin}/login?error=missing_params`);
  }

  try {
    const { account } = await createAdminClient();
    const session = await account.createSession(userId, secret);

    // Ensure profile exists (non-blocking)
    await ensureProfile(session.userId, undefined).catch(() => {});

    // Return an HTML response that sets the cookie and redirects client-side
    // This ensures the cookie is fully set before the browser navigates to /dashboard
    const html = `<!DOCTYPE html>
<html><head>
<meta http-equiv="refresh" content="0;url=/dashboard">
<script>window.location.href="/dashboard";</script>
</head><body></body></html>`;

    const response = new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });

    response.cookies.set(SESSION_COOKIE_NAME, session.secret, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("[OAUTH CALLBACK ERROR]", error);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }
}
