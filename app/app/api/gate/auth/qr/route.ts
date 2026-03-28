import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { createSessionFromQR } from "@/lib/gate/session";
import { generateFingerprint } from "@/lib/crypto/device-fingerprint";
import { checkAuthRateLimit } from "@/lib/security/rate-limit";

const QRPayloadSchema = z.object({
  payload: z.string().min(1),
  deviceId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit QR auth attempts by IP to prevent brute force
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rateLimit = checkAuthRateLimit(`gate-qr:${ip}`);
    if (!rateLimit.allowed) {
      const retrySeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
      return NextResponse.json(
        { error: "Too many attempts. Please try again later.", retryAfter: retrySeconds },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = QRPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Decode base64 QR payload → signed envelope { payload, signature, kid }
    let envelope: { payload: string; signature: string; kid: string };
    try {
      const decoded = Buffer.from(parsed.data.payload, "base64").toString("utf8");
      envelope = JSON.parse(decoded);
    } catch {
      // Fallback: try parsing as direct JSON (legacy format)
      try {
        const direct = JSON.parse(parsed.data.payload);
        // Legacy format without signature — reject
        if (!direct.signature || !direct.kid) {
          return NextResponse.json(
            { error: "QR code missing cryptographic signature" },
            { status: 400 },
          );
        }
        envelope = direct;
      } catch {
        return NextResponse.json(
          { error: "Invalid QR code format" },
          { status: 400 },
        );
      }
    }

    // Parse inner payload
    let qrPayload: {
      eventId: string;
      gateId: string;
      issuedBy: string;
      issuedAt: string;
      expiresAt: string;
    };

    try {
      qrPayload = JSON.parse(envelope.payload);
    } catch {
      return NextResponse.json(
        { error: "Invalid QR code inner payload" },
        { status: 400 },
      );
    }

    // Validate required QR fields
    if (!qrPayload.eventId || !qrPayload.gateId || !qrPayload.issuedBy || !qrPayload.expiresAt) {
      return NextResponse.json(
        { error: "QR code missing required fields" },
        { status: 400 },
      );
    }

    // Extract device info from headers
    const userAgent = request.headers.get("user-agent") ?? "unknown";
    const screenSize = request.headers.get("x-screen-size") ?? "unknown";
    const timezone = request.headers.get("x-timezone") ?? "unknown";
    const language = request.headers.get("x-language") ?? "unknown";

    const fingerprint = generateFingerprint(userAgent, screenSize, timezone, language);
    const deviceId = parsed.data.deviceId ?? crypto.randomUUID();

    // Pass signature and key ID for verification
    const session = await createSessionFromQR(
      {
        ...qrPayload,
        signature: envelope.signature,
        kid: envelope.kid,
      },
      deviceId,
      fingerprint,
    );

    const response = NextResponse.json(
      {
        sessionId: session.sessionId,
        eventId: session.eventId,
        gateId: session.gateId,
      },
      { status: 200 },
    );

    response.cookies.set("riffoff-gate-session", session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      path: "/api/gate",
      maxAge: 12 * 60 * 60, // 12 hours
    });

    return response;
  } catch (error) {
    // Never expose internal error details — return generic message
    const knownMessages = ["QR code has expired", "Invalid QR code signature", "Signing key has been revoked", "QR code missing"];
    const rawMessage = error instanceof Error ? error.message : "";
    const message = knownMessages.find((m) => rawMessage.includes(m)) ?? "Invalid QR code. Please try again.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
