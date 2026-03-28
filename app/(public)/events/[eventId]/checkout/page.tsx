"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
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

  const [checkoutParams, setCheckoutParams] = useState<{
    eventId: string;
    tierId: string;
    qty: number;
    eventTitle: string;
    tierName: string;
    price: number;
    currency: string;
  } | null>(null);

  // Resolve params on mount — must be in useEffect, not render body
  useEffect(() => {
    Promise.all([params, searchParams]).then(([p, sp]) => {
      setCheckoutParams({
        eventId: p.eventId,
        tierId: sp.tierId ?? "",
        qty: parseInt(sp.qty ?? "1", 10),
        eventTitle: decodeURIComponent(sp.eventTitle ?? "Event"),
        tierName: decodeURIComponent(sp.tierName ?? "Ticket"),
        price: parseFloat(sp.price ?? "0"),
        currency: sp.currency ?? "USD",
      });
    });
  }, [params, searchParams]);

  // Auth redirect — must be before any conditional returns to satisfy Rules of Hooks
  useEffect(() => {
    if (checkoutParams && !isAuthenticated) {
      router.push(`/login?redirect=/events/${checkoutParams.eventId}`);
    }
  }, [checkoutParams, isAuthenticated, router]);

  if (!checkoutParams) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 rounded bg-muted" />
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="h-80 rounded-2xl bg-muted" />
            <div className="space-y-4">
              <div className="h-12 rounded-2xl bg-muted" />
              <div className="h-20 rounded-2xl bg-muted" />
              <div className="h-14 rounded-2xl bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const total = checkoutParams.price * checkoutParams.qty;
  const formattedTotal = total.toLocaleString("en-MY", {
    style: "currency",
    currency: checkoutParams.currency,
  });

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
    });
  };

  const showPayPal = provider === "paypal" && result?.orderId;

  return (
    <div className={`mx-auto px-4 py-8 sm:px-6 ${showPayPal ? "max-w-lg" : "max-w-4xl"}`}>
      {/* Back link */}
      <Link
        href={`/events/${checkoutParams.eventId}`}
        className="mb-8 inline-flex items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-coral"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to event
      </Link>

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-coral" aria-hidden="true" />
          <h1 className="font-display text-2xl sm:text-3xl">Checkout</h1>
        </div>
        <p className="mt-1 text-base text-muted-foreground">
          Secure your spot — complete your ticket purchase
        </p>
      </div>

      {/* Layout: two-column for initial selection, single-column for PayPal */}
      <div className={showPayPal ? "space-y-6" : "grid gap-8 lg:grid-cols-[1fr,380px]"}>
        {/* ── Ticket summary ── */}
        <div className="space-y-6">
          {/* Reservation timer */}
          {result?.reservationId && reservationExpiry && (
            <CheckoutTimer
              expiresAt={reservationExpiry}
              onExpire={() =>
                setError("Your reservation has expired. Please go back and try again.")
              }
            />
          )}

          {/* Order summary ticket card */}
          <OrderSummary
            eventTitle={checkoutParams.eventTitle}
            tierName={checkoutParams.tierName}
            unitPrice={checkoutParams.price}
            qty={checkoutParams.qty}
            currency={checkoutParams.currency}
          />
        </div>

        {/* ── Payment section ── */}
        <div className={showPayPal ? "space-y-6" : "space-y-6 lg:sticky lg:top-24 lg:self-start"}>
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
              className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-base text-destructive"
            >
              {error}
            </div>
          )}

          {/* CTA area */}
          {showPayPal ? (
            <div className="w-full">
              <p className="mb-3 text-center text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Complete payment
              </p>
              <PayPalCheckout orderId={result.orderId} />
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isPending}
              className="checkout-cta group relative w-full overflow-hidden rounded-2xl bg-coral px-6 py-4 text-center font-bold text-white transition-all hover:shadow-[0_8px_30px_rgba(var(--coral-rgb,191,255,0),0.3)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:text-[#08080a]"
            >
              {/* Shimmer effect */}
              <span
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                aria-hidden="true"
              />

              <span className="relative flex items-center justify-center gap-2">
                <Lock className="size-4" aria-hidden="true" />
                {isPending ? (
                  "Processing..."
                ) : (
                  <>
                    Pay {formattedTotal}
                    {provider === "paypal" && " with PayPal"}
                    {provider === "tng" && " with TNG"}
                  </>
                )}
              </span>
            </button>
          )}

          {/* Trust signals */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1.5 text-sm">
                <Lock className="size-3" aria-hidden="true" />
                256-bit SSL
              </div>
              <div className="size-1 rounded-full bg-border" aria-hidden="true" />
              <div className="flex items-center gap-1.5 text-sm">
                <ShieldCheck className="size-3" aria-hidden="true" />
                PCI Compliant
              </div>
            </div>
            <p className="max-w-[280px] text-center text-sm leading-relaxed text-muted-foreground/60">
              By completing this purchase you agree to our terms of service.
              Payments are processed securely.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
