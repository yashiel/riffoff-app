"use server";

import { getPayPalAccessToken, getPayPalApiUrl } from "./client";

interface CreateOrderInput {
  amountCents: number;
  currency: string;
  orderId: string;
}

export async function createPayPalOrder(
  input: CreateOrderInput,
): Promise<{ id: string }> {
  const accessToken = await getPayPalAccessToken();
  const apiUrl = getPayPalApiUrl();
  const amountStr = (input.amountCents / 100).toFixed(2);

  const response = await fetch(`${apiUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.orderId,
          amount: {
            currency_code: input.currency,
            value: amountStr,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal create order failed: ${error}`);
  }

  return response.json();
}

export async function capturePayPalOrder(
  paypalOrderId: string,
): Promise<{ id: string; status: string; purchase_units: Array<{ reference_id: string }> }> {
  const accessToken = await getPayPalAccessToken();
  const apiUrl = getPayPalApiUrl();

  const response = await fetch(
    `${apiUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal capture failed: ${error}`);
  }

  return response.json();
}
