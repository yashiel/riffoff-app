import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { capturePayPalOrder } from "@/lib/payments/paypal/orders";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { issueTicketsForOrder } from "@/lib/tickets/issue";
import type { OrderDoc } from "@/lib/appwrite/types";

const schema = z.object({
  orderID: z.string().min(1),
  appOrderId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const sessionClient = await createSessionClient();
    if (!sessionClient) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await sessionClient.account.get();

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Verify the order belongs to the authenticated user
    const { databases } = await createAdminClient();
    const order = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      parsed.data.appOrderId,
    )) as unknown as OrderDoc;

    if (order.userId !== user.$id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const captureResult = await capturePayPalOrder(parsed.data.orderID);

    if (captureResult.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 },
      );
    }

    // Issue tickets (idempotent)
    const { tickets, alreadyProcessed } = await issueTicketsForOrder(
      parsed.data.appOrderId,
      parsed.data.orderID,
    );

    return NextResponse.json({
      success: true,
      ticketCount: tickets.length,
      alreadyProcessed,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to capture PayPal order" },
      { status: 500 },
    );
  }
}
