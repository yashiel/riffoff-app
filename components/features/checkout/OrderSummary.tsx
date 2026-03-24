import { Shield } from "lucide-react";
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
    <div className="rounded-xl border border-[var(--border)] bg-[#242424] p-5">
      <h3 className="font-display text-[22px]">Order Summary</h3>

      <div className="mt-4 space-y-2.5 text-[14px]">
        <p className="font-medium text-foreground">{eventTitle}</p>
        <div className="flex justify-between text-muted-foreground">
          <span>
            {tierName} &times; {qty}
          </span>
          <span className="text-foreground">{formatCurrency(unitPrice * qty, currency)}</span>
        </div>
      </div>

      <div className="my-4 border-t border-[var(--border)]" />

      {/* Total */}
      <div className="flex justify-between">
        <span className="text-[16px] font-bold text-foreground">Total</span>
        <span className="text-[20px] font-bold text-foreground">
          {formatCurrency(total, currency)}
        </span>
      </div>

      {/* Price transparency — DICE-inspired */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-[rgba(232,119,88,0.08)] p-3">
        <Shield className="mt-0.5 size-4 shrink-0 text-coral" />
        <div>
          <p className="text-[12px] font-medium text-coral">
            No hidden fees
          </p>
          <p className="text-[12px] text-muted-foreground">
            The price shown is the price you pay. No service charges,
            no booking fees, no surprises at checkout.
          </p>
        </div>
      </div>
    </div>
  );
}
