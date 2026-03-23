"use client";

import { cn } from "@/lib/utils";
import type { PaymentProvider } from "@/lib/appwrite/types";

const PROVIDERS: Array<{
  id: PaymentProvider;
  name: string;
  description: string;
}> = [
  { id: "stripe", name: "Card", description: "Visa, Mastercard, Amex" },
  { id: "paypal", name: "PayPal", description: "Pay with PayPal balance" },
  { id: "tng", name: "TNG eWallet", description: "Touch 'n Go (MYR only)" },
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
  const availableProviders = PROVIDERS.filter((p) => {
    // TNG only for MYR
    if (p.id === "tng" && currency !== "MYR") return false;
    return true;
  });

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Payment method</h3>
      <div className="grid gap-2">
        {availableProviders.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => onChange(provider.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
              selected === provider.id
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50",
            )}
          >
            <div
              className={cn(
                "flex size-4 items-center justify-center rounded-full border-2",
                selected === provider.id
                  ? "border-primary"
                  : "border-muted-foreground/30",
              )}
            >
              {selected === provider.id && (
                <div className="size-2 rounded-full bg-primary" />
              )}
            </div>
            <div>
              <p className="font-medium">{provider.name}</p>
              <p className="text-xs text-muted-foreground">
                {provider.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
