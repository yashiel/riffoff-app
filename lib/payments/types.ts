import type { PaymentProvider as ProviderEnum } from "@/lib/appwrite/types";

export type { ProviderEnum as PaymentProviderName };

export interface CheckoutInput {
  eventId: string;
  tierId: string;
  qty: number;
  provider: ProviderEnum;
}

export interface CheckoutResult {
  /** Redirect URL for Stripe/TNG, or order ID for PayPal */
  redirectUrl?: string;
  paypalOrderId?: string;
  orderId: string;
  reservationId: string;
  error?: string;
}

export interface PaymentConfirmation {
  orderId: string;
  providerRef: string;
  provider: ProviderEnum;
  amountCents: number;
  currency: string;
}

export interface WebhookResult {
  success: boolean;
  orderId?: string;
  error?: string;
}
