"use server";

import { signTNGRequest, getTNGApiUrl, getTNGHeaders } from "./client";

interface CreateTNGPaymentInput {
  orderId: string;
  amountCents: number;
  eventTitle: string;
}

interface TNGPaymentResult {
  resultStatus: "S" | "A" | "F" | "U";
  redirectUrl?: string;
  paymentId?: string;
  error?: string;
}

/**
 * Create a TNG eWallet payment.
 * Amount is in smallest unit (sen): "10000" = RM100.00
 * Returns cashier redirect URL on status "A".
 */
export async function createTNGPayment(
  input: CreateTNGPaymentInput,
): Promise<TNGPaymentResult> {
  const apiUrl = getTNGApiUrl();
  const path = "/v1/payments/pay";
  const requestTime = new Date().toISOString();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const requestBody = {
    partnerId: process.env.TNG_PARTNER_ID!,
    appId: process.env.TNG_APP_ID!,
    paymentRequestId: input.orderId,
    paymentAmount: {
      currency: "MYR",
      value: String(input.amountCents), // TNG expects string in smallest unit
    },
    paymentFactor: {
      isCashierPayment: true,
    },
    paymentNotifyUrl: `${appUrl}/api/webhooks/tng`,
    paymentReturnUrl: `${appUrl}/payment/success?provider=tng&order_id=${input.orderId}`,
    productCode: "CASHIER_PAYMENT",
    productName: input.eventTitle,
    extendInfo: JSON.stringify({
      customerBelongsTo: "TNG",
    }),
  };

  const bodyStr = JSON.stringify(requestBody);
  const signature = signTNGRequest("POST", path, bodyStr, requestTime);

  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: getTNGHeaders(requestTime, signature),
    body: bodyStr,
  });

  const data = await response.json();
  const resultStatus = data.result?.resultStatus;

  if (resultStatus === "A") {
    return {
      resultStatus: "A",
      redirectUrl: data.actionForm?.redirectionUrl,
      paymentId: data.paymentId,
    };
  }

  if (resultStatus === "S") {
    return { resultStatus: "S", paymentId: data.paymentId };
  }

  if (resultStatus === "U") {
    return { resultStatus: "U", paymentId: data.paymentId };
  }

  return {
    resultStatus: "F",
    error: data.result?.resultMessage ?? "Payment failed",
  };
}

/** Inquiry payment status for TNG "U" (unknown) status */
export async function inquiryTNGPayment(
  orderId: string,
): Promise<{ resultStatus: string; paymentId?: string }> {
  const apiUrl = getTNGApiUrl();
  const path = "/v1/payments/inquiryPayment";
  const requestTime = new Date().toISOString();

  const requestBody = {
    partnerId: process.env.TNG_PARTNER_ID!,
    paymentRequestId: orderId,
  };

  const bodyStr = JSON.stringify(requestBody);
  const signature = signTNGRequest("POST", path, bodyStr, requestTime);

  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: getTNGHeaders(requestTime, signature),
    body: bodyStr,
  });

  const data = await response.json();
  return {
    resultStatus: data.result?.resultStatus ?? "U",
    paymentId: data.paymentId,
  };
}
