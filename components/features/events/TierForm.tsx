"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { createTier, updateTier } from "@/actions/tiers";
import type { TicketTierDoc } from "@/lib/appwrite/types";

interface TierFormProps {
  eventId: string;
  tier?: TicketTierDoc;
  onComplete?: () => void;
}

export function TierForm({ eventId, tier, onComplete }: TierFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        onComplete?.();
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tierName" className="text-[12px] text-muted-foreground">Tier name</Label>
          <input
            id="tierName" name="name" required maxLength={100}
            defaultValue={tier?.name ?? ""}
            placeholder="e.g. Early Bird"
            className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[13px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tierPrice" className="text-[12px] text-muted-foreground">Price</Label>
          <input
            id="tierPrice" name="price" type="number" required min={0} step={0.01}
            defaultValue={tier?.price ?? ""}
            placeholder="0.00"
            className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[13px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)]"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="tierCurrency" className="text-[12px] text-muted-foreground">Currency</Label>
          <select
            id="tierCurrency" name="currency"
            defaultValue={tier?.currency ?? "MYR"}
            className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[13px] text-white outline-none"
          >
            <option value="MYR">MYR</option>
            <option value="USD">USD</option>
            <option value="SGD">SGD</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tierQuota" className="text-[12px] text-muted-foreground">Quota</Label>
          <input
            id="tierQuota" name="quota" type="number" required min={1}
            defaultValue={tier?.quota ?? ""}
            placeholder="100"
            className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[13px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tierSort" className="text-[12px] text-muted-foreground">Sort order</Label>
          <input
            id="tierSort" name="sortOrder" type="number" min={0}
            defaultValue={tier?.sortOrder ?? 0}
            className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[13px] text-white outline-none focus:border-[rgba(255,255,255,0.3)]"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="saleStarts" className="text-[12px] text-muted-foreground">Sale starts (optional)</Label>
          <input
            id="saleStarts" name="saleStartsAt" type="datetime-local"
            defaultValue={tier?.saleStartsAt ? tier.saleStartsAt.slice(0, 16) : ""}
            className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[13px] text-white outline-none [color-scheme:dark]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="saleEnds" className="text-[12px] text-muted-foreground">Sale ends (optional)</Label>
          <input
            id="saleEnds" name="saleEndsAt" type="datetime-local"
            defaultValue={tier?.saleEndsAt ? tier.saleEndsAt.slice(0, 16) : ""}
            className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[13px] text-white outline-none [color-scheme:dark]"
          />
        </div>
      </div>

      <button type="submit" disabled={isPending} className="btn-primary !py-2 !text-[12px]">
        {isPending ? "Saving..." : isEditing ? "Update Tier" : "Add Tier"}
      </button>
    </form>
  );
}
