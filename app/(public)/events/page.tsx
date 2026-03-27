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
import type {
  EventFilters as EventFilterType,
  EventWithVenue,
} from "@/actions/events";

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
  const displayCurrency =
    cookieStore.get("riffoff-currency")?.value || "original";

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

  const totalEvents = events.length + (totalPages - 1) * 12;
  const hasActiveFilters = params.search || params.genre || params.date;

  return (
    <div>
      {/* ═══════════════════════════════════════════
          HERO SEARCH SECTION — full-bleed dark band
          ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-b border-border bg-[#0a0a0c] dark:bg-[#0a0a0c]">
        {/* Ambient gradient orbs */}
        <div
          className="pointer-events-none absolute -left-40 -top-40 size-[500px] rounded-full opacity-15 blur-[120px]"
          style={{ background: "var(--coral)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 right-1/4 size-[400px] rounded-full opacity-8 blur-[100px]"
          style={{ background: "#f97316" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-20 top-0 size-[300px] rounded-full opacity-8 blur-[100px]"
          style={{ background: "#38bdf8" }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          {/* Title */}
          <div className="text-center">
            <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.9] tracking-tighter text-white">
              Find your
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, var(--coral) 0%, #f97316 25%, #fb7185 50%, #a78bfa 75%, #38bdf8 100%)",
                }}
              >
                next show
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base text-white/50">
              {hasActiveFilters
                ? `${totalEvents} event${totalEvents !== 1 ? "s" : ""} match your search`
                : totalEvents > 0
                  ? `${totalEvents}+ live events waiting for you`
                  : "Discover live music events near you"}
            </p>
          </div>

          {/* Search bar */}
          <div className="mx-auto mt-8 max-w-xl">
            <Suspense>
              <EventFilters genres={genres} heroMode />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FILTERS — genre/date pills below hero
          ═══════════════════════════════════════════ */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Suspense>
            <EventFilters genres={genres} pillsOnly />
          </Suspense>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          EVENT GRID
          ═══════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<SkeletonList count={6} />}>
          <EventGrid
            events={serialize(events)}
            wishlistedIds={wishlistedIds}
            convertedPrices={convertedPrices}
          />
        </Suspense>

        {/* Pagination */}
        <div className="mt-12">
          <Pagination currentPage={page} totalPages={totalPages} />
        </div>
      </section>
    </div>
  );
}
