import { Suspense } from "react";
import { cookies } from "next/headers";
import { EventGrid } from "@/components/features/events/EventGrid";
import { EventFilters } from "@/components/features/events/EventFilters";
import { Pagination } from "@/components/features/events/Pagination";
import { CurrencySelector } from "@/components/features/shared/CurrencySelector";
import { SkeletonList } from "@/components/features/shared/SkeletonCard";
import { getPublishedEvents, getAvailableGenres } from "@/actions/events";
import { getWishlistedEventIds } from "@/actions/wishlist";
import { getExchangeRates, formatConvertedPrice } from "@/lib/currency";
import { serialize } from "@/lib/utils";
import type { EventFilters as EventFilterType, EventWithVenue } from "@/actions/events";

export const metadata = { title: "Discover Events" };
export const dynamic = "force-dynamic";

interface EventsPageProps {
  searchParams: Promise<{
    search?: string;
    genre?: string;
    date?: string;
    page?: string;
  }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;

  const filters: EventFilterType = {
    search: params.search,
    genre: params.genre,
    dateRange: (params.date as EventFilterType["dateRange"]) ?? "all",
    page: params.page ? parseInt(params.page, 10) : 1,
  };

  // Read currency preference from cookie
  const cookieStore = await cookies();
  const displayCurrency = cookieStore.get("riffoff-currency")?.value || "original";

  let events: EventWithVenue[] = [];
  let page = 1;
  let totalPages = 1;
  let genres: string[] = [];
  let wishlistedIds: string[] = [];
  let convertedPrices: Record<string, string> = {};

  try {
    const [eventsResult, genresResult] = await Promise.all([
      getPublishedEvents(filters),
      getAvailableGenres(),
    ]);
    events = eventsResult.events;
    page = eventsResult.page;
    totalPages = eventsResult.totalPages;
    genres = genresResult;

    // Fetch wishlist state for logged-in users
    const eventIds = events.map((e) => e.$id);
    if (eventIds.length > 0) {
      const wishlistSet = await getWishlistedEventIds(eventIds);
      wishlistedIds = [...wishlistSet];
    }

    // Convert prices if a display currency is selected
    if (displayCurrency !== "original") {
      const rates = await getExchangeRates("USD");
      if (rates) {
        for (const event of events) {
          if (event.minPrice && event.minPriceCurrency && event.minPriceCurrency !== displayCurrency) {
            const converted = formatConvertedPrice(
              event.minPrice,
              event.minPriceCurrency,
              displayCurrency,
              rates,
            );
            if (converted) convertedPrices[event.$id] = converted;
          }
        }
      }
    }
  } catch {
    // Appwrite may not be reachable — show empty state
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl tracking-tight sm:text-3xl">Discover Events</h1>
          <p className="text-[13px] text-muted-foreground">
            Find live music events near you
          </p>
        </div>
        <Suspense>
          <CurrencySelector currentCurrency={displayCurrency} />
        </Suspense>
      </div>

      <div className="mt-6">
        <Suspense>
          <EventFilters genres={genres} />
        </Suspense>
      </div>

      <div className="mt-8">
        <Suspense fallback={<SkeletonList count={6} />}>
          <EventGrid
            events={serialize(events)}
            wishlistedIds={wishlistedIds}
            convertedPrices={convertedPrices}
          />
        </Suspense>
      </div>

      <div className="mt-8">
        <Pagination currentPage={page} totalPages={totalPages} />
      </div>
    </div>
  );
}
