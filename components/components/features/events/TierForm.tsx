"use client";

import { useRef, useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/features/shared/DateTimePicker";
import { createTier, updateTier } from "@/actions/tiers";
import type { TicketTierDoc } from "@/lib/appwrite/types";

const CURRENCIES = [
  { code: "MYR", flag: "🇲🇾", name: "Malaysian Ringgit" },
  { code: "USD", flag: "🇺🇸", name: "US Dollar" },
  { code: "SGD", flag: "🇸🇬", name: "Singapore Dollar" },
  { code: "LKR", flag: "🇱🇰", name: "Sri Lankan Rupee" },
  { code: "THB", flag: "🇹🇭", name: "Thai Baht" },
  { code: "PHP", flag: "🇵🇭", name: "Philippine Peso" },
  { code: "IDR", flag: "🇮🇩", name: "Indonesian Rupiah" },
  { code: "INR", flag: "🇮🇳", name: "Indian Rupee" },
  { code: "KRW", flag: "🇰🇷", name: "South Korean Won" },
  { code: "JPY", flag: "🇯🇵", name: "Japanese Yen" },
  { code: "CNY", flag: "🇨🇳", name: "Chinese Yuan" },
  { code: "HKD", flag: "🇭🇰", name: "Hong Kong Dollar" },
  { code: "TWD", flag: "🇹🇼", name: "Taiwan Dollar" },
  { code: "VND", flag: "🇻🇳", name: "Vietnamese Dong" },
  { code: "EUR", flag: "🇪🇺", name: "Euro" },
  { code: "GBP", flag: "🇬🇧", name: "British Pound" },
  { code: "AUD", flag: "🇦🇺", name: "Australian Dollar" },
  { code: "NZD", flag: "🇳🇿", name: "New Zealand Dollar" },
  { code: "CAD", flag: "🇨🇦", name: "Canadian Dollar" },
  { code: "CHF", flag: "🇨🇭", name: "Swiss Franc" },
  { code: "AED", flag: "🇦🇪", name: "UAE Dirham" },
  { code: "SAR", flag: "🇸🇦", name: "Saudi Riyal" },
  { code: "BRL", flag: "🇧🇷", name: "Brazilian Real" },
  { code: "MXN", flag: "🇲🇽", name: "Mexican Peso" },
  { code: "ZAR", flag: "🇿🇦", name: "South African Rand" },
  { code: "NGN", flag: "🇳🇬", name: "Nigerian Naira" },
  { code: "EGP", flag: "🇪🇬", name: "Egyptian Pound" },
  { code: "KES", flag: "🇰🇪", name: "Kenyan Shilling" },
  { code: "BDT", flag: "🇧🇩", name: "Bangladeshi Taka" },
  { code: "PKR", flag: "🇵🇰", name: "Pakistani Rupee" },
];

interface TierFormProps {
  eventId: string;
  tier?: TicketTierDoc;
  onComplete?: () => void;
}

export function TierForm({ eventId, tier, onComplete }: TierFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isEditing = !!tier;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const input = {
        eventId,
        name: formData.get("name") as string,
        price: parseFloat(formData.get("price") as string),
        currency: (formData.get("currency") as string) || "MYR",
        quota: parseInt(formData.get("quota") as string, 10),
        saleStartsAt: (formData.get("saleStartsAt") as string)
          ? new Date(formData.get("saleStartsAt") as string).toISOString()
          : null,
        saleEndsAt: (formData.get("saleEndsAt") as string)
          ? new Date(formData.get("saleEndsAt") as string).toISOString()
          : null,
        sortOrder: parseInt(formData.get("sortOrder") as string, 10) || 0,
      };

      const result = isEditing
        ? await updateTier(tier.$id, input)
        : await createTier(input);

      if (result.error) {
        setError(result.error);
      } else {
        if (!isEditing) formRef.current?.reset();
        onComplete?.();
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-base text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tierName" className="text-base text-muted-foreground">Tier name</Label>
          <input
            id="tierName" name="name" required maxLength={100}
            defaultValue={tier?.name ?? ""}
            placeholder="e.g. Early Bird"
            className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tierPrice" className="text-base text-muted-foreground">Price</Label>
          <input
            id="tierPrice" name="price" type="number" required min={0} step={0.01}
            defaultValue={tier?.price ?? ""}
            placeholder="0.00"
            className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)]"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="tierCurrency" className="text-base text-muted-foreground">Currency</Label>
          <select
            id="tierCurrency" name="currency"
            defaultValue={tier?.currency ?? "MYR"}
            className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2 text-base text-foreground outline-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tierQuota" className="text-base text-muted-foreground">Quota</Label>
          <input
            id="tierQuota" name="quota" type="number" required min={1}
            defaultValue={tier?.quota ?? ""}
            placeholder="100"
            className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tierSort" className="text-base text-muted-foreground">Sort order</Label>
          <input
            id="tierSort" name="sortOrder" type="number" min={0}
            defaultValue={tier?.sortOrder ?? 0}
            className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2 text-base text-foreground outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)]"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-base text-muted-foreground">Sale starts (optional)</Label>
          <DateTimePicker
            name="saleStartsAt"
            label="Sale start date"
            defaultValue={tier?.saleStartsAt ?? undefined}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-base text-muted-foreground">Sale ends (optional)</Label>
          <DateTimePicker
            name="saleEndsAt"
            label="Sale end date"
            defaultValue={tier?.saleEndsAt ?? undefined}
          />
        </div>
      </div>

      <button type="submit" disabled={isPending} className="btn-primary !py-2 !text-base">
        {isPending ? "Saving..." : isEditing ? "Update Tier" : "Add Tier"}
      </button>
    </form>
  );
}
