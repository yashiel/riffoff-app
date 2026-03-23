"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OrderSummary } from "@/components/features/checkout/OrderSummary";
import { ProviderSelector } from "@/components/features/checkout/ProviderSelector";
import { CheckoutTimer } from "@/components/features/checkout/CheckoutTimer";
import { PayPalCheckout } from "@/components/features/checkout/PayPalCheckout";
import { initiateCheckout } from "@/actions/checkout";
import { useAuth } from "@/providers/auth-provider";
import type { PaymentProvider } from "@/lib/appwrite/types";
import type { CheckoutResult } from "@/lib/payments/types";

interface CheckoutPageProps {
  searchParams: Promise<{
    tierId?: string;
    qty?: string;
    eventTitle?: string;
    tierName?: string;
    price?: string;
    currency?: string;
  }>;
  params: Promise<{ eventId: string }>;
}

export default function CheckoutPage({ searchParams, params }: CheckoutPageProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [provider, setProvider] = useState<PaymentProvider>("stripe");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reservationExpiry, setReservationExpiry] = useState<string | null>(null);

  // Parse search params (passed from event detail "Get Tickets" button)
  const [checkoutParams, setCheckoutParams] = useState<{
    eventId: string;
    tierId: string;
    qty: number;
    eventTitle: string;
    tierName: string;
    price: number;
    currency: string;
  } | null>(null);

  // Resolve params on mount
  if (!checkoutParams) {
    Promise.all([params, searchParams]).then(([p, sp]) => {
      setCheckoutParams({
        eventId: p.eventId,
        tierId: sp.tierId ?? "",
        qty: parseInt(sp.qty ?? "1", 10),
        eventTitle: decodeURIComponent(sp.eventTitle ?? "Event"),
        tierName: decodeURIComponent(sp.tierName ?? "Ticket"),
        price: parseFloat(sp.price ?? "0"),
        currency: sp.currency ?? "MYR",
      });
    });
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-64 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push(`/login?redirect=/events/${checkoutParams.eventId}`);
    return null;
  }

  const handleCheckout = () => {
    setError(null);
    startTransition(async () => {
      const checkoutResult = await initiateCheckout({
        eventId: checkoutParams.eventId,
        tierId: checkoutParams.tierId,
        qty: checkoutParams.qty,
        provider,
      });

      if (checkoutResult.error) {
        setError(checkoutResult.error);
        return;
      }

      setResult(checkoutResult);
      setReservationExpiry(new Date(Date.now() + 15 * 60 * 1000).toISOString());
      // Stripe/TNG redirect happens in the server action
      // PayPal shows buttons here
    });
  };

  const showPayPal = provider === "paypal" && result?.orderId;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
      <p className="mt-1 text-muted-foreground">Complete your ticket purchase</p>

      <div className="mt-6 space-y-6">
        {/* Reservation timer */}
        {result?.reservationId && reservationExpiry && (
          <CheckoutTimer
            expiresAt={reservationExpiry}
            onExpire={() => setError("Your reservation has expired. Please go back and try again.")}
          />
        )}

        {/* Order summary */}
        <OrderSummary
          eventTitle={checkoutParams.eventTitle}
          tierName={checkoutParams.tierName}
          unitPrice={checkoutParams.price}
          qty={checkoutParams.qty}
          currency={checkoutParams.currency}
        />

        <Separator />

        {/* Provider selector */}
        {!showPayPal && (
          <ProviderSelector
            selected={provider}
            onChange={setProvider}
            currency={checkoutParams.currency}
          />
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {/* PayPal buttons (shown after checkout initiated) */}
        {showPayPal ? (
          <PayPalCheckout orderId={result.orderId} />
        ) : (
          <Button
            onClick={handleCheckout}
            disabled={isPending}
            className="w-full"
            size="lg"
          >
            {isPending
              ? "Processing..."
              : provider === "paypal"
                ? "Continue with PayPal"
                : `Pay ${(checkoutParams.price * checkoutParams.qty).toLocaleString("en-MY", { style: "currency", currency: checkoutParams.currency })}`}
          </Button>
        )}

        <p className="text-center text-xs text-muted-foreground">
          By completing this purchase you agree to our terms of service.
          Payments are processed securely.
        </p>
      </div>
    </div>
  );
}
