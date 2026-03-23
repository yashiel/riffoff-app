import { NextRequest, NextResponse } from "next/server";
import {
  verifyTNGSignature,
  extractSignatureValue,
} from "@/lib/payments/tng/client";
import { issueTicketsForOrder } from "@/lib/tickets/issue";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signatureHeader = request.headers.get("signature") ?? "";
  const clientId = request.headers.get("client-id") ?? "";
  const responseTime = request.headers.get("response-time") ?? "";

  // Verify TNG signature
  const signature = extractSignatureValue(signatureHeader);
  const isValid = verifyTNGSignature(
    "POST",
    "/api/webhooks/tng",
    body,
    responseTime,
    signature,
  );

  if (!isValid || clientId !== process.env.TNG_CLIENT_ID) {
    console.error("TNG webhook: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const notification = JSON.parse(body);
  const resultStatus = notification.result?.resultStatus;
  const orderId = notification.paymentRequestId;

  if (resultStatus === "S" && orderId) {
    const { alreadyProcessed } = await issueTicketsForOrder(
      orderId,
      notification.paymentId ?? "",
    );

    if (alreadyProcessed) {
      console.log(`TNG webhook: order ${orderId} already processed (idempotent)`);
    }
  }

  // Always respond with success to TNG
  return NextResponse.json({
    result: { resultCode: "SUCCESS", resultStatus: "S" },
  });
}
