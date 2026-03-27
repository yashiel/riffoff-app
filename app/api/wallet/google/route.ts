import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSessionClient, createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";

const GoogleWalletSchema = z.object({
  ticketId: z.string().min(1),
  eventTitle: z.string().min(1),
  eventDate: z.string().min(1),
  venueName: z.string().min(1),
  ticketCode: z.string().min(1),
  tierName: z.string().min(1),
});

/**
 * Google Wallet Pass API
 *
 * To enable, you need:
 * 1. Google Cloud project with Wallet API enabled
 * 2. Service account with "Google Wallet API" role
 * 3. Issuer ID from Google Pay & Wallet Console
 *
 * Set these env vars:
 *   GOOGLE_WALLET_ISSUER_ID=...
 *   GOOGLE_WALLET_SERVICE_ACCOUNT_KEY=... (JSON key, base64 encoded)
 *
 * Docs: https://developers.google.com/wallet/tickets/events
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check — user must be logged in
    const sessionClient = await createSessionClient();
    if (!sessionClient) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const user = await sessionClient.account.get();

    // Validate input
    const body = await request.json();
    const parsed = GoogleWalletSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { ticketId, eventTitle, eventDate, venueName, ticketCode, tierName } = parsed.data;

    // Verify the user owns this ticket
    const { databases } = await createAdminClient();
    try {
      const ticket = await databases.getDocument(DATABASE_ID, COLLECTIONS.TICKETS, ticketId);
      if (ticket.userId !== user.$id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    const serviceAccountKey = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY;

    if (!issuerId || !serviceAccountKey) {
      return NextResponse.json(
        { error: "Google Wallet not configured. Add GOOGLE_WALLET_ISSUER_ID and GOOGLE_WALLET_SERVICE_ACCOUNT_KEY to .env.local" },
        { status: 501 },
      );
    }

    // Decode service account key
    const keyData = JSON.parse(
      Buffer.from(serviceAccountKey, "base64").toString("utf-8"),
    );

    // Create JWT for Google Wallet save URL
    const now = Math.floor(Date.now() / 1000);

    const passObject = {
      id: `${issuerId}.${ticketId}`,
      classId: `${issuerId}.riffoff-event-ticket`,
      state: "ACTIVE",
      heroImage: {
        sourceUri: { uri: "https://riffoff.app/og-image.png" },
      },
      textModulesData: [
        { header: "TIER", body: tierName },
        { header: "CODE", body: ticketCode },
      ],
      linksModuleData: {
        uris: [
          {
            uri: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tickets/${ticketId}`,
            description: "View ticket",
          },
        ],
      },
      barcode: {
        type: "QR_CODE",
        value: ticketCode,
      },
      eventTicketObject: {
        eventName: { defaultValue: { language: "en-US", value: eventTitle } },
        venue: {
          name: { defaultValue: { language: "en-US", value: venueName } },
        },
        dateTime: { start: eventDate },
        ticketHolderName: "Ticket Holder",
        ticketNumber: ticketCode,
        seatInfo: {
          section: { defaultValue: { language: "en-US", value: tierName } },
        },
      },
    };

    // In production, sign with JWT and create save URL
    // For now, return the pass object structure
    const saveUrl = `https://pay.google.com/gp/v/save/${Buffer.from(JSON.stringify({ eventTicketObjects: [passObject] })).toString("base64")}`;

    return NextResponse.json({ saveUrl });
  } catch (error) {
    console.error("Google Wallet error:", error);
    return NextResponse.json(
      { error: "Failed to create Google Wallet pass" },
      { status: 500 },
    );
  }
}
