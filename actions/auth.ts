"use server";

import { ID, OAuthProvider } from "node-appwrite";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { SESSION_COOKIE_NAME } from "@/lib/appwrite/config";
import { ensureProfile } from "./profiles";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type AuthResult = {
  error?: string;
};

export async function login(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, password } = parsed.data;

  try {
    const { account } = await createAdminClient();
    const session = await account.createEmailPasswordSession(email, password);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session.secret, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  } catch {
    return { error: "Invalid email or password" };
  }

  redirect("/dashboard");
}

export async function register(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, email, password } = parsed.data;

  try {
    const { account } = await createAdminClient();

    await account.create(ID.unique(), email, password, name);
    const session = await account.createEmailPasswordSession(email, password);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session.secret, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    // Create profile document for the new user
    await ensureProfile(session.userId, name);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed";
    if (message.includes("already exists")) {
      return { error: "An account with this email already exists" };
    }
    return { error: "Registration failed. Please try again." };
  }

  redirect("/dashboard");
}

export async function loginWithProvider(provider: "google" | "facebook") {
  const { account } = await createAdminClient();
  const headerStore = await headers();
  const origin = headerStore.get("origin") || process.env.NEXT_PUBLIC_APP_URL;

  const oauthProvider =
    provider === "google" ? OAuthProvider.Google : OAuthProvider.Facebook;

  const redirectUrl = await account.createOAuth2Token(
    oauthProvider,
    `${origin}/callback`,
    `${origin}/login`,
  );

  redirect(redirectUrl);
}

export async function logout() {
  const sessionClient = await createSessionClient();
  if (sessionClient) {
    try {
      await sessionClient.account.deleteSession("current");
    } catch {
      // Session may already be expired — that's fine
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  redirect("/login");
}
