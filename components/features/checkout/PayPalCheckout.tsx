"use client";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface PayPalCheckoutProps {
  orderId: string;
}

export function PayPalCheckout({ orderId }: PayPalCheckoutProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if (!clientId) {
    return (
      <p className="text-base text-muted-foreground">
        PayPal is not configured.
      </p>
    );
  }

  return (
    <div className="w-full space-y-3">
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-destructive/10 px-4 py-3 text-base text-destructive"
        >
          {error}
        </div>
      )}

      <PayPalScriptProvider options={{ clientId }}>
        <PayPalButtons
          className="w-full [&>div]:!min-w-full"
          style={{ layout: "vertical", shape: "pill", label: "pay", height: 50 }}
          createOrder={async () => {
            setError(null);
            const res = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId }),
            });
            const data = await res.json();
            if (data.error) {
              setError(data.error);
              throw new Error(data.error);
            }
            return data.id;
          }}
          onApprove={async (data) => {
            const res = await fetch("/api/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderID: data.orderID,
                appOrderId: orderId,
              }),
            });
            const result = await res.json();
            if (result.success) {
              router.push(`/payment/success?order_id=${orderId}`);
            } else {
              setError(result.error ?? "Payment failed");
            }
          }}
          onError={() => {
            setError("PayPal encountered an error. Please try again.");
          }}
        />
      </PayPalScriptProvider>
    </div>
  );
}
