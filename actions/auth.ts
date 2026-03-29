"use server";

import { randomInt } from "crypto";
import { ID, OAuthProvider, Query } from "node-appwrite";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS, SESSION_COOKIE_NAME } from "@/lib/appwrite/config";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";
import { ensureProfile } from "./profiles";
import { checkAuthRateLimit } from "@/lib/security/rate-limit";
import type { VerificationCodeDoc } from "@/lib/appwrite/types";

const PENDING_COOKIE = "riffoff-pending-verification";
const OTP_EXPIRY_MINUTES = 10;
const MAX_VERIFY_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/** Only these roles can be selected during signup. "admin" is BLOCKED. */
const ALLOWED_SIGNUP_ROLES = ["attendee", "artist", "organiser"] as const;

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  termsAccepted: z.literal("on", { message: "You must accept the terms" }),
  role: z.enum(ALLOWED_SIGNUP_ROLES).default("attendee"),
});

const verifySchema = z.object({
  email: z.email(),
  code: z.string().length(6, "Code must be 6 digits"),
});

export type AuthResult = {
  error?: string;
  redirect?: string;
};

// ─── Login ─────────────────────────────────────

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

  // Rate limit by email to prevent brute force
  const rateLimitResult = checkAuthRateLimit(email);
  if (!rateLimitResult.allowed) {
    const retryMinutes = Math.ceil(rateLimitResult.retryAfterMs / 60000);
    return { error: `Too many login attempts. Try again in ${retryMinutes} minute${retryMinutes > 1 ? "s" : ""}.` };
  }

  try {
    const { account } = await createAdminClient();
    const session = await account.createEmailPasswordSession(email, password);

    // Reactivate deactivated accounts on login
    const { reactivateAccount } = await import("@/actions/settings/deactivate");
    await reactivateAccount(session.userId);

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

// ─── Register (Step 1 — create user + send OTP) ─────────

export async function register(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    termsAccepted: formData.get("termsAccepted"),
    role: formData.get("role") || "attendee",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, email, password, role } = parsed.data;

  try {
    const { account, databases } = await createAdminClient();

    // Create the Appwrite user (no session yet — they must verify first)
    const user = await account.create(ID.unique(), email, password, name);

    // Generate 6-digit OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Store OTP in verification-codes collection
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.VERIFICATION_CODES,
      ID.unique(),
      {
        email,
        code,
        userId: user.$id,
        expiresAt,
        attempts: 0,
        used: false,
      },
    );

    // Send verification email — don't block registration if email fails
    const emailResult = await sendVerificationEmail(email, code, name);
    if (!emailResult.success) {
      console.error("[AUTH] Email send failed during registration:", emailResult.error);
      // Still proceed — user can request a resend on the verify page
    }

    // Store pending verification data in httpOnly cookie
    // (so verifyOTP can create the session without knowing the password)
    const cookieStore = await cookies();
    cookieStore.set(PENDING_COOKIE, JSON.stringify({
      userId: user.$id,
      email,
      name,
      role,
    }), {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 15, // 15 minutes
    });

  } catch (error) {
    console.error("[REGISTER ERROR]", error);
    const message = error instanceof Error ? error.message : "Registration failed";
    if (message.includes("already exists")) {
      return { error: "An account with this email already exists" };
    }
    return { error: `Registration failed: ${message}` };
  }

  // Return redirect URL instead of calling redirect()
  // (so the client can handle navigation after form state update)
  return { redirect: `/verify?email=${encodeURIComponent(parsed.data.email)}` };
}

// ─── Verify OTP (Step 2 — validate code, create session) ─────────

export async function verifyOTP(
  email: string,
  code: string,
): Promise<AuthResult> {
  const parsed = verifySchema.safeParse({ email, code });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Rate limit OTP verification to prevent brute force
  const rateLimitResult = checkAuthRateLimit(`otp:${email}`);
  if (!rateLimitResult.allowed) {
    const retryMinutes = Math.ceil(rateLimitResult.retryAfterMs / 60000);
    return { error: `Too many verification attempts. Try again in ${retryMinutes} minute${retryMinutes > 1 ? "s" : ""}.` };
  }

  const { databases, account } = await createAdminClient();

  // Find the verification code
  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.VERIFICATION_CODES,
    [
      Query.equal("email", email),
      Query.equal("code", code),
      Query.equal("used", false),
      Query.orderDesc("$createdAt"),
      Query.limit(1),
    ],
  );

  if (result.documents.length === 0) {
    // Check if there's a code with too many attempts
    const anyCode = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.VERIFICATION_CODES,
      [
        Query.equal("email", email),
        Query.equal("used", false),
        Query.orderDesc("$createdAt"),
        Query.limit(1),
      ],
    );

    if (anyCode.documents.length > 0) {
      const doc = anyCode.documents[0] as unknown as VerificationCodeDoc;
      if (doc.attempts >= MAX_VERIFY_ATTEMPTS) {
        return { error: "Too many attempts. Please request a new code." };
      }
      // Increment attempts
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.VERIFICATION_CODES,
        doc.$id,
        { attempts: doc.attempts + 1 },
      );
    }

    return { error: "Invalid verification code" };
  }

  const verificationDoc = result.documents[0] as unknown as VerificationCodeDoc;

  // Check expiry
  if (new Date(verificationDoc.expiresAt) < new Date()) {
    return { error: "Code has expired. Please request a new one." };
  }

  // Check attempts
  if (verificationDoc.attempts >= MAX_VERIFY_ATTEMPTS) {
    return { error: "Too many attempts. Please request a new code." };
  }

  // Mark as used
  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.VERIFICATION_CODES,
    verificationDoc.$id,
    { used: true },
  );

  // Read the pending cookie to get userId
  const cookieStore = await cookies();
  const pendingCookie = cookieStore.get(PENDING_COOKIE)?.value;

  let userId = verificationDoc.userId;
  let userName: string | undefined;
  let signupRole: "attendee" | "artist" | "organiser" = "attendee";

  if (pendingCookie) {
    try {
      const pending = JSON.parse(pendingCookie);
      userId = pending.userId;
      userName = pending.name;
      // Only allow safe roles — block any tampering (e.g. "admin")
      if (pending.role === "artist" || pending.role === "organiser") {
        signupRole = pending.role;
      }
    } catch {}
  }

  // Create session using admin SDK
  try {
    const session = await account.createSession(userId, "");

    // Set the session cookie
    cookieStore.set(SESSION_COOKIE_NAME, session.secret, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    // Create profile with signup role
    await ensureProfile(userId, userName, signupRole);

    // Send welcome email (non-blocking)
    void sendWelcomeEmail(email, userName || "");

    // Log consent for terms acceptance
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.USER_CONSENTS,
      ID.unique(),
      {
        userId,
        consentType: "terms_of_service",
        granted: true,
        grantedAt: new Date().toISOString(),
        revokedAt: null,
        ipAddress: null,
        userAgent: null,
      },
    );

    // Clean up pending cookie
    cookieStore.delete(PENDING_COOKIE);
  } catch (err) {
    console.error("[VERIFY] Session creation error:", err);

    // Fallback: try email/password session from pending cookie
    if (pendingCookie) {
      try {
        JSON.parse(pendingCookie);
        // We can't create a session without the password via admin SDK
        // So we need to use a different approach — create a magic URL token
        // For now, redirect to login with a success message
        cookieStore.delete(PENDING_COOKIE);
        return { redirect: "/login?verified=true" };
      } catch {}
    }

    return { error: "Verification succeeded but session creation failed. Please log in." };
  }

  return { redirect: "/dashboard" };
}

// ─── Resend OTP ─────────

export async function resendOTP(
  email: string,
): Promise<AuthResult> {
  if (!email || !z.email().safeParse(email).success) {
    return { error: "Invalid email" };
  }

  const { databases } = await createAdminClient();

  // Check cooldown — find most recent code for this email
  const recent = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.VERIFICATION_CODES,
    [
      Query.equal("email", email),
      Query.orderDesc("$createdAt"),
      Query.limit(1),
    ],
  );

  if (recent.documents.length > 0) {
    const lastCode = recent.documents[0];
    const timeSince = Date.now() - new Date(lastCode.$createdAt).getTime();
    if (timeSince < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - timeSince) / 1000);
      return { error: `Please wait ${waitSeconds} seconds before requesting a new code` };
    }
  }

  // Read pending cookie for userId and name
  const cookieStore = await cookies();
  const pendingCookie = cookieStore.get(PENDING_COOKIE)?.value;

  let userId = "";
  let userName: string | undefined;
  if (pendingCookie) {
    try {
      const pending = JSON.parse(pendingCookie);
      userId = pending.userId;
      userName = pending.name;
    } catch {}
  }

  if (!userId) {
    return { error: "Session expired. Please register again." };
  }

  // Generate new OTP
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  // Mark old codes as used
  if (recent.documents.length > 0) {
    for (const doc of recent.documents) {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.VERIFICATION_CODES,
        doc.$id,
        { used: true },
      ).catch(() => {});
    }
  }

  // Store new code
  await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.VERIFICATION_CODES,
    ID.unique(),
    {
      email,
      code,
      userId,
      expiresAt,
      attempts: 0,
      used: false,
    },
  );

  // Send email
  const emailResult = await sendVerificationEmail(email, code, userName);
  if (!emailResult.success) {
    return { error: "Failed to send verification email" };
  }

  return {};
}

// ─── OAuth ─────────

export async function loginWithProvider(provider: "google" | "facebook") {
  const { account } = await createAdminClient();

  // Always use the configured app URL — never trust the Origin header
  // to prevent open redirect via attacker-controlled origin
  const origin = process.env.NEXT_PUBLIC_APP_URL;

  const oauthProvider =
    provider === "google" ? OAuthProvider.Google : OAuthProvider.Facebook;

  const redirectUrl = await account.createOAuth2Token(
    oauthProvider,
    `${origin}/callback`,
    `${origin}/login`,
  );

  redirect(redirectUrl);
}

// ─── Logout ─────────

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

// ─── Helpers ─────────

function generateOTP(): string {
  return randomInt(100000, 999999).toString();
}
