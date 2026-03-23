import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { capturePayPalOrder } from "@/lib/payments/paypal/orders";
import { issueTicketsForOrder } from "@/lib/tickets/issue";

const schema = z.object({
  orderID: z.string().min(1),
  appOrderId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
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
  } catch (error) {
    console.error("PayPal capture error:", error);
    return NextResponse.json(
      { error: "Failed to capture PayPal order" },
      { status: 500 },
    );
  }
}
