import { Shield, Ticket, Music } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface OrderSummaryProps {
  eventTitle: string;
  tierName: string;
  unitPrice: number;
  qty: number;
  currency: string;
}

export function OrderSummary({
  eventTitle,
  tierName,
  unitPrice,
  qty,
  currency,
}: OrderSummaryProps) {
  const total = unitPrice * qty;

  return (
    <div className="relative">
      {/* ── Ticket top section ── */}
      <div className="rounded-t-2xl border border-b-0 border-border bg-card px-6 pt-6 pb-5">
        {/* Small label */}
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground">
          <Ticket className="size-3.5" aria-hidden="true" />
          Order Summary
        </div>

        {/* Event title */}
        <h3 className="mt-3 font-display text-xl leading-tight sm:text-2xl">
          {eventTitle}
        </h3>

        {/* Tier pill */}
        <div className="mt-3">
          <span className="genre-pill">
            <Music className="size-3" aria-hidden="true" />
            {tierName}
          </span>
        </div>

        {/* Line items */}
        <div className="mt-5 space-y-2 text-base">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {tierName} &times; {qty}
            </span>
            <span className="font-medium text-foreground tabular-nums">
              {formatCurrency(unitPrice * qty, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Service fee</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Free
            </span>
          </div>
        </div>
      </div>

      {/* ── Perforated tear line ── */}
      <div className="relative flex items-center" aria-hidden="true">
        {/* Left semicircle cutout */}
        <div className="absolute -left-3 size-6 rounded-full bg-background" />
        {/* Dashed line */}
        <div className="w-full border-t-2 border-dashed border-border" />
        {/* Right semicircle cutout */}
        <div className="absolute -right-3 size-6 rounded-full bg-background" />
      </div>

      {/* ── Ticket bottom section (total) ── */}
      <div className="rounded-b-2xl border border-t-0 border-border bg-card px-6 pt-4 pb-6">
        {/* Total */}
        <div className="flex items-end justify-between">
          <span className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
            Total
          </span>
          <div className="text-right">
            <span className="text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
              {formatCurrency(total, currency)}
            </span>
          </div>
        </div>

        {/* No hidden fees */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-coral/5 border border-coral/10 p-3">
          <Shield className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-coral">No hidden fees</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The price shown is the price you pay. No service charges, no
              booking fees, no surprises.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
