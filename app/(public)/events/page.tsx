import { Suspense } from "react";
import { cookies } from "next/headers";
import { Search } from "lucide-react";
import { EventGrid } from "@/components/features/events/EventGrid";
import { EventFilters } from "@/components/features/events/EventFilters";
import { Pagination } from "@/components/features/events/Pagination";
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

    const eventIds = events.map((e) => e.$id);
    if (eventIds.length > 0) {
      const wishlistSet = await getWishlistedEventIds(eventIds);
      wishlistedIds = [...wishlistSet];
    }

    if (displayCurrency !== "original") {
      const rates = await getExchangeRates("USD");
      if (rates) {
        for (const event of events) {
          if (event.minPrice && event.minPriceCurrency && event.minPriceCurrency !== displayCurrency) {
            const converted = formatConvertedPrice(event.minPrice, event.minPriceCurrency, displayCurrency, rates);
            if (converted) convertedPrices[event.$id] = converted;
          }
        }
      }
    }
  } catch {}

  const totalEvents = events.length + (totalPages - 1) * 12;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* ─── Page header — Shotgun style ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[clamp(2rem,5vw,3rem)] leading-none tracking-tight">
            Discover Events
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {totalEvents > 0 ? `${totalEvents}+ upcoming events` : "Find live music events near you"}
          </p>
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div className="mt-6">
        <Suspense>
          <EventFilters genres={genres} />
        </Suspense>
      </div>

      {/* ─── Date-grouped event grid ─── */}
      <div className="mt-10">
        <Suspense fallback={<SkeletonList count={6} />}>
          <EventGrid
            events={serialize(events)}
            wishlistedIds={wishlistedIds}
            convertedPrices={convertedPrices}
          />
        </Suspense>
      </div>

      {/* ─── Pagination ─── */}
      <div className="mt-10">
        <Pagination currentPage={page} totalPages={totalPages} />
      </div>
    </div>
  );
}
