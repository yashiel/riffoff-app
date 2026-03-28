"use client";

import { useState, useTransition } from "react";
import { Trash2, Edit2, X } from "lucide-react";
import { TierForm } from "./TierForm";
import { deleteTier } from "@/actions/tiers";
import { formatCurrency } from "@/lib/utils";
import type { TicketTierDoc } from "@/lib/appwrite/types";

interface TierCardProps {
  tier: TicketTierDoc;
}

export function TierCard({ tier }: TierCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const available = tier.quota - tier.soldCount;

  function handleDelete() {
    if (!confirm(`Delete "${tier.name}"? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTier(tier.$id);
      if (result.error) setError(result.error);
    });
  }

  if (isEditing) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[#242424] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-base font-medium text-muted-foreground">Editing: {tier.name}</span>
          <button onClick={() => setIsEditing(false)} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <TierForm
          eventId={tier.eventId}
          tier={tier}
          onComplete={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--border)]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-foreground">{tier.name}</span>
          {tier.soldCount > 0 && (
            <span className="text-base text-muted-foreground">
              {tier.soldCount}/{tier.quota} sold
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-base text-muted-foreground">
          <span className="font-medium text-foreground">
            {formatCurrency(tier.price, tier.currency)}
          </span>
          <span>{available} available</span>
          {tier.saleStartsAt && (
            <span>Sale: {new Date(tier.saleStartsAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {error && (
        <span className="mr-3 text-base text-red-400">{error}</span>
      )}

      <div className="flex gap-1">
        <button
          onClick={() => setIsEditing(true)}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Edit tier"
        >
          <Edit2 className="size-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending || tier.soldCount > 0}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
          aria-label="Delete tier"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
