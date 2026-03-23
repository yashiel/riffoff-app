"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { TicketTierDoc } from "@/lib/appwrite/types";

interface TierListProps {
  tiers: TicketTierDoc[];
  isFree: boolean;
  eventId: string;
  eventTitle: string;
}

export function TierList({ tiers, isFree, eventId, eventTitle }: TierListProps) {
  if (isFree) return null;
  if (tiers.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Tickets</h2>
      <div className="space-y-2">
        {tiers.map((tier) => {
          const available = tier.quota - tier.soldCount;
          const isSoldOut = available <= 0;
          const isLowStock = available > 0 && available <= 10;
          const isOnSale = isTierOnSale(tier);
          const canBuy = !isSoldOut && isOnSale;

          const checkoutUrl = `/events/${eventId}/checkout?tierId=${tier.$id}&qty=1&eventTitle=${encodeURIComponent(eventTitle)}&tierName=${encodeURIComponent(tier.name)}&price=${tier.price}&currency=${tier.currency}`;

          return (
            <Card key={tier.$id} className={isSoldOut ? "opacity-60" : ""}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tier.name}</span>
                    {isSoldOut && (
                      <Badge variant="secondary" className="text-xs">
                        Sold out
                      </Badge>
                    )}
                    {isLowStock && !isSoldOut && (
                      <Badge
                        variant="outline"
                        className="border-amber-500/20 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400"
                      >
                        {available} left
                      </Badge>
                    )}
                    {!isOnSale && !isSoldOut && (
                      <Badge variant="secondary" className="text-xs">
                        Not on sale
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatCurrency(tier.price, tier.currency)}
                  </p>
                </div>

                {canBuy ? (
                  <Button size="sm" className="shrink-0" asChild>
                    <Link href={checkoutUrl}>Get Tickets</Link>
                  </Button>
                ) : (
                  <Button size="sm" disabled className="shrink-0">
                    {isSoldOut ? "Sold out" : "Not on sale"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function isTierOnSale(tier: TicketTierDoc): boolean {
  const now = new Date();
  if (tier.saleStartsAt && new Date(tier.saleStartsAt) > now) return false;
  if (tier.saleEndsAt && new Date(tier.saleEndsAt) < now) return false;
  return true;
}
