import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSessionClient, createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";

const AppleWalletSchema = z.object({
  ticketId: z.string().min(1),
  eventTitle: z.string().min(1),
  eventDate: z.string().min(1),
  venueName: z.string().min(1),
  ticketCode: z.string().min(1),
  tierName: z.string().min(1),
});

/**
 * Apple Wallet Pass API
 *
 * To enable, you need:
 * 1. Apple Developer account
 * 2. Pass Type ID certificate
 * 3. WWDR (Apple Worldwide Developer Relations) certificate
 *
 * Set these env vars:
 *   APPLE_WALLET_PASS_TYPE_ID=pass.com.yourapp.ticket
 *   APPLE_WALLET_TEAM_ID=...
 *   APPLE_WALLET_CERT=... (PEM, base64 encoded)
 *   APPLE_WALLET_KEY=... (PEM private key, base64 encoded)
 *   APPLE_WALLET_WWDR=... (WWDR cert, base64 encoded)
 *
 * Docs: https://developer.apple.com/documentation/walletpasses
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
    const parsed = AppleWalletSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { ticketId } = parsed.data;

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

    const passTypeId = process.env.APPLE_WALLET_PASS_TYPE_ID;
    const teamId = process.env.APPLE_WALLET_TEAM_ID;

    if (!passTypeId || !teamId) {
      return NextResponse.json(
        { error: "Apple Wallet not configured. Add APPLE_WALLET_PASS_TYPE_ID and APPLE_WALLET_TEAM_ID to .env.local" },
        { status: 501 },
      );
    }

    // When Apple Developer certificates are configured, generate a signed .pkpass:
    // 1. Build pass.json (eventTicket type with primary/secondary/auxiliary fields)
    // 2. Add icon.png, logo.png, strip.png assets
    // 3. Create manifest.json with SHA1 hashes of all files
    // 4. Sign manifest with pass certificate + WWDR cert
    // 5. Package as ZIP with .pkpass extension
    // See: https://developer.apple.com/documentation/walletpasses
    return NextResponse.json(
      { error: "Apple Wallet not configured. Add Apple Developer certificates to .env.local" },
      { status: 501 },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to create Apple Wallet pass" },
      { status: 500 },
    );
  }
}
