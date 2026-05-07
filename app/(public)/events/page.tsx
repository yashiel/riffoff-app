import { Suspense } from "react";
import { cookies } from "next/headers";
import { EventsContent } from "@/components/features/events/EventsContent";
import { getPublishedEvents, getAvailableGenres, getEventCountsByCity } from "@/actions/events";
import { getWishlistedEventIds } from "@/actions/wishlist";
import { getExchangeRates, formatConvertedPrice } from "@/lib/currency";
import { serialize } from "@/lib/utils";
import type {
  EventFilters as EventFilterType,
  EventWithVenue,
} from "@/actions/events";

export const metadata = { title: "Discover Events" };
export const revalidate = 300; // 5-minute ISR — event listings don't change rapidly

interface EventsPageProps {
  searchParams: Promise<{
    search?: string;
    genre?: string;
    date?: string;
    city?: string;
    page?: string;
    cursor?: string;
  }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;

  const filters: EventFilterType = {
    search: params.search,
    genre: params.genre,
    dateRange: (params.date as EventFilterType["dateRange"]) ?? "all",
    city: params.city,
    page: params.page ? parseInt(params.page, 10) : 1,
    cursor: params.cursor,
  };

  const cookieStore = await cookies();
  const displayCurrency =
    cookieStore.get("riffoff-currency")?.value || "original";

  let events: EventWithVenue[] = [];
  let page = 1;
  let totalPages = 1;
  let lastCursor: string | null = null;
  let genres: string[] = [];
  let wishlistedIds: string[] = [];
  const convertedPrices: Record<string, string> = {};
  let cityEvents: Array<{ cityId: string; count: number }> = [];
  let totalEvents = 0;

  try {
    const [eventsResult, genresResult, cityEventsResult] = await Promise.all([
      getPublishedEvents(filters),
      getAvailableGenres(),
      getEventCountsByCity(),
    ]);
    events = eventsResult.events;
    page = eventsResult.page;
    totalPages = eventsResult.totalPages;
    lastCursor = eventsResult.lastCursor;
    genres = genresResult;
    cityEvents = cityEventsResult;
    totalEvents = cityEventsResult.reduce((acc, c) => acc + c.count, 0);

    const eventIds = events.map((e) => e.$id);
    if (eventIds.length > 0) {
      wishlistedIds = await getWishlistedEventIds(eventIds);
    }

    if (displayCurrency !== "original") {
      const rates = await getExchangeRates("USD");
      if (rates) {
        for (const event of events) {
          if (
            event.minPrice &&
            event.minPriceCurrency &&
            event.minPriceCurrency !== displayCurrency
          ) {
            const converted = formatConvertedPrice(
              event.minPrice,
              event.minPriceCurrency,
              displayCurrency,
              rates
            );
            if (converted) convertedPrices[event.$id] = converted;
          }
        }
      }
    }
  } catch {}

  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-64px)]">
          <div className="hidden w-72 animate-pulse bg-[#0a0a0c] lg:block" />
          <div className="flex-1 animate-pulse bg-background" />
        </div>
      }
    >
      <EventsContent
        events={serialize(events)}
        genres={genres}
        cityEvents={cityEvents}
        totalEvents={totalEvents}
        wishlistedIds={wishlistedIds}
        convertedPrices={convertedPrices}
        page={page}
        totalPages={totalPages}
        lastCursor={lastCursor}
      />
    </Suspense>
  );
}
