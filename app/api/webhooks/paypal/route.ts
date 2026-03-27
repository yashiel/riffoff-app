import { NextRequest, NextResponse } from "next/server";
import { getPayPalAccessToken, getPayPalApiUrl } from "@/lib/payments/paypal/client";
import { issueTicketsForOrder } from "@/lib/tickets/issue";

/**
 * Verify PayPal webhook signature by calling PayPal's verification API.
 * See: https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature_post
 */
async function verifyPayPalWebhook(
  request: NextRequest,
  body: string,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("PAYPAL_WEBHOOK_ID not configured");
    return false;
  }

  const accessToken = await getPayPalAccessToken();
  const apiUrl = getPayPalApiUrl();

  const verificationBody = {
    auth_algo: request.headers.get("paypal-auth-algo") ?? "",
    cert_url: request.headers.get("paypal-cert-url") ?? "",
    transmission_id: request.headers.get("paypal-transmission-id") ?? "",
    transmission_sig: request.headers.get("paypal-transmission-sig") ?? "",
    transmission_time: request.headers.get("paypal-transmission-time") ?? "",
    webhook_id: webhookId,
    webhook_event: JSON.parse(body),
  };

  const response = await fetch(
    `${apiUrl}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(verificationBody),
    },
  );

  if (!response.ok) {
    return false;
  }

  const result = await response.json();
  return result.verification_status === "SUCCESS";
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  // Verify webhook signature
  const isValid = await verifyPayPalWebhook(request, body);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);

  switch (event.event_type) {
    case "CHECKOUT.ORDER.APPROVED": {
      // Order approved by buyer — capture happens client-side via capture-order endpoint
      break;
    }

    case "PAYMENT.CAPTURE.COMPLETED": {
      // Payment successfully captured
      const capture = event.resource;
      const orderId = capture?.supplementary_data?.related_ids?.order_id;

      if (orderId) {
        await issueTicketsForOrder(orderId, capture.id ?? "");
      }
      break;
    }

    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.REVERSED": {
      // Payment denied or reversed — log for investigation
      console.error(
        `PayPal payment ${event.event_type}:`,
        event.resource?.id,
      );
      break;
    }
  }

  return NextResponse.json({ received: true });
}
