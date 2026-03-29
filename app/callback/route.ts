import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite/server";
import { SESSION_COOKIE_NAME } from "@/lib/appwrite/config";
import { ensureProfile } from "@/actions/profiles";

/**
 * OAuth callback Route Handler.
 *
 * Returns a styled loading page that matches the app theme while
 * the cookie is set, then redirects client-side to /dashboard.
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

    // Return a branded loading page that redirects after cookie is set
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Signing in... | RiffOff</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0e0e10;
      color: #f0f0f2;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      text-align: center;
      animation: fadeIn 0.3s ease;
    }
    .logo {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    .logo span { color: #bfff00; }
    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid rgba(255,255,255,0.1);
      border-top-color: #bfff00;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin: 0 auto 16px;
    }
    .text {
      font-size: 14px;
      color: rgba(255,255,255,0.4);
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span>RIFF</span>OFF</div>
    <div class="spinner"></div>
    <p class="text">Signing you in...</p>
  </div>
  <script>
    // Small delay to ensure cookie is fully processed before navigating
    setTimeout(function() { window.location.replace("/dashboard/tickets"); }, 500);
  </script>
</body>
</html>`;

    const response = new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });

    response.cookies.set(SESSION_COOKIE_NAME, session.secret, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }
}
