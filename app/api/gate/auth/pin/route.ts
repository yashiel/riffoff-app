import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { createSessionFromPIN } from "@/lib/gate/session";
import { generateFingerprint } from "@/lib/crypto/device-fingerprint";
import { checkAuthRateLimit } from "@/lib/security/rate-limit";

const PINSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits"),
  gateId: z.string().min(1, "gateId is required"),
  deviceId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit PIN attempts by IP to prevent brute force
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rateLimit = await checkAuthRateLimit(`gate-pin:${ip}`);
    if (!rateLimit.allowed) {
      const retrySeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
      return NextResponse.json(
        { error: "Too many attempts. Please try again later.", retryAfter: retrySeconds },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = PINSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { pin, gateId } = parsed.data;

    // Extract device info from headers
    const userAgent = request.headers.get("user-agent") ?? "unknown";
    const screenSize = request.headers.get("x-screen-size") ?? "unknown";
    const timezone = request.headers.get("x-timezone") ?? "unknown";
    const language = request.headers.get("x-language") ?? "unknown";

    const fingerprint = generateFingerprint(userAgent, screenSize, timezone, language);
    const deviceId = parsed.data.deviceId ?? crypto.randomUUID();

    const session = await createSessionFromPIN(pin, gateId, deviceId, fingerprint, {
      userAgent, screenSize, timezone, language,
    });

    // Look up gate name for the response
    let gateName = session.gateId || "Default";
    try {
      const { createAdminClient } = await import("@/lib/appwrite/server");
      const { DATABASE_ID, COLLECTIONS } = await import("@/lib/appwrite/config");
      const { databases } = await createAdminClient();
      if (session.gateId && session.gateId !== "default") {
        const gate = await databases.getDocument(DATABASE_ID, COLLECTIONS.GATES, session.gateId);
        gateName = (gate.name as string) || gateName;
      }
    } catch {
      // Gate lookup failed — use gateId as fallback
    }

    const response = NextResponse.json(
      {
        sessionId: session.sessionId,
        eventId: session.eventId,
        gateId: session.gateId,
        gateName,
        deviceId,
      },
      { status: 200 },
    );

    // Send session token via header (for cross-origin clients that can't use cookies)
    response.headers.set("X-Gate-Session", session.sessionId);
    response.headers.set("Access-Control-Expose-Headers", "X-Gate-Session");

    response.cookies.set("riffoff-gate-session", session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      path: "/api/gate",
      maxAge: 12 * 60 * 60, // 12 hours
    });

    return response;
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const errorMap: [string, string][] = [
      ["Device limit", "This gate has reached its device limit. Ask the organiser to increase it."],
      ["Invalid", "Invalid PIN. Please try again."],
      ["expired", "PIN has expired. Request a new one."],
      ["already used", "PIN has been used too many times."],
      ["Gate not found", "Gate not found. Check your PIN."],
    ];
    const matched = errorMap.find(([key]) => rawMessage.includes(key));
    const message = matched?.[1] ?? "Invalid PIN. Please try again.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
