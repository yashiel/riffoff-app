"use client";

import { CreditCard, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentProvider } from "@/lib/appwrite/types";

const PROVIDERS: Array<{
  id: PaymentProvider;
  name: string;
  icon: typeof CreditCard;
}> = [
  { id: "stripe", name: "Card", icon: CreditCard },
  { id: "paypal", name: "PayPal", icon: Wallet },
  { id: "tng", name: "TNG", icon: Wallet },
];

interface ProviderSelectorProps {
  selected: PaymentProvider;
  onChange: (provider: PaymentProvider) => void;
  currency: string;
}

export function ProviderSelector({
  selected,
  onChange,
  currency,
}: ProviderSelectorProps) {
  const available = PROVIDERS.filter((p) => {
    if (p.id === "tng" && currency !== "MYR") return false;
    return true;
  });

  return (
    <fieldset>
      <legend className="mb-3 text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground">
        Payment method
      </legend>

      {/* Segmented pill selector */}
      <div className="flex gap-2 rounded-2xl border border-border bg-muted/30 p-1.5" role="radiogroup">
        {available.map((provider) => {
          const isSelected = selected === provider.id;
          const Icon = provider.icon;

          return (
            <button
              key={provider.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(provider.id)}
              className={cn(
                "group relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-semibold transition-all duration-200",
                isSelected
                  ? "bg-coral text-white shadow-md shadow-coral/20 dark:text-[#08080a]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-4 transition-colors",
                  isSelected
                    ? "text-white dark:text-[#08080a]"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
                aria-hidden="true"
              />
              {provider.name}
            </button>
          );
        })}
      </div>

      {/* Provider detail hint */}
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {selected === "stripe" && "Visa, Mastercard, Amex — secure card payment"}
        {selected === "paypal" && "Pay with your PayPal balance or linked bank"}
        {selected === "tng" && "Touch 'n Go eWallet — MYR only"}
      </p>
    </fieldset>
  );
}
