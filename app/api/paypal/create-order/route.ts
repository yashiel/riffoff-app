import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createPayPalOrder } from "@/lib/payments/paypal/orders";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import type { OrderDoc } from "@/lib/appwrite/types";

const schema = z.object({
  orderId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { databases } = await createAdminClient();
    const order = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      parsed.data.orderId,
    )) as unknown as OrderDoc;

    if (order.status !== "pending") {
      return NextResponse.json(
        { error: "Order is not pending" },
        { status: 400 },
      );
    }

    const paypalOrder = await createPayPalOrder({
      amountCents: order.amount,
      currency: order.currency,
      orderId: order.$id,
    });

    // Store PayPal order ID as provider ref
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      order.$id,
      { providerRef: paypalOrder.id },
    );

    return NextResponse.json({ id: paypalOrder.id });
  } catch (error) {
    console.error("PayPal create order error:", error);
    return NextResponse.json(
      { error: "Failed to create PayPal order" },
      { status: 500 },
    );
  }
}
