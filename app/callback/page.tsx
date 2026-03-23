import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/appwrite/server";
import { SESSION_COOKIE_NAME } from "@/lib/appwrite/config";
import { ensureProfile } from "@/actions/profiles";

/**
 * OAuth callback handler.
 * Appwrite redirects here with userId and secret query params after OAuth login.
 */
export default async function CallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; secret?: string }>;
}) {
  const params = await searchParams;
  const { userId, secret } = params;

  if (!userId || !secret) {
    redirect("/login");
  }

  // Create session from the OAuth token
  const { account } = await createAdminClient();

  try {
    const session = await account.createSession(userId, secret);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session.secret, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Ensure profile exists (first OAuth login creates it)
    const user = await account.get();
    await ensureProfile(userId, user.name || undefined);
  } catch {
    redirect("/login");
  }

  redirect("/dashboard");
}
