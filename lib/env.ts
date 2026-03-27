import { z } from "zod/v4";

const envSchema = z.object({
  // App
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),

  // Appwrite — Public
  NEXT_PUBLIC_APPWRITE_ENDPOINT: z.url(),
  NEXT_PUBLIC_APPWRITE_PROJECT: z.string().min(1),

  // Appwrite — Server only
  NEXT_APPWRITE_KEY: z.string().min(1),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_")
    .optional(),

  // PayPal
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_API_URL: z.url().optional(),
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: z.string().optional(),

  // TNG Digital — ALL server only
  TNG_CLIENT_ID: z.string().optional(),
  TNG_PARTNER_ID: z.string().optional(),
  TNG_PRIVATE_KEY: z.string().optional(),
  TNG_PUBLIC_KEY: z.string().optional(),
  TNG_API_URL: z.url().optional(),
  TNG_APP_ID: z.string().optional(),

  // Notifications
  RESEND_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Ticket signing — minimum 32 chars for HMAC security
  TICKET_SIGNING_SECRET: z.string().min(32).optional(),

  // CSRF — minimum 32 chars for HMAC security
  CSRF_SECRET: z.string().min(32).optional(),

  // Gate scanner
  GATE_KEY_ENCRYPTION_KEY: z.string().min(32).optional(),
});

// ─── Server-only secret leak detection ───────────────

const SERVER_ONLY_PREFIXES = [
  "NEXT_APPWRITE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "PAYPAL_CLIENT_SECRET",
  "TNG_PRIVATE_KEY",
  "TNG_PUBLIC_KEY",
  "TNG_CLIENT_ID",
  "TNG_PARTNER_ID",
  "TICKET_SIGNING_SECRET",
  "CSRF_SECRET",
  "RESEND_API_KEY",
  "TWILIO_AUTH_TOKEN",
  "GATE_KEY_ENCRYPTION_KEY",
];

function checkNoServerSecretLeaks() {
  if (typeof window !== "undefined") {
    // Client-side — verify no server secrets leaked
    for (const key of SERVER_ONLY_PREFIXES) {
      if (key in (globalThis as Record<string, unknown>)) {
        console.error(`[SECURITY] Server secret "${key}" found in client bundle!`);
      }
    }
  }
}

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    console.error("Invalid environment variables:\n", formatted);
    throw new Error("Invalid environment variables. Check server logs.");
  }

  checkNoServerSecretLeaks();

  return result.data;
}

export const env = validateEnv();
