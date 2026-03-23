import { Suspense } from "react";
import { EventGrid } from "@/components/features/events/EventGrid";
import { EventFilters } from "@/components/features/events/EventFilters";
import { Pagination } from "@/components/features/events/Pagination";
import { SkeletonList } from "@/components/features/shared/SkeletonCard";
import { getPublishedEvents, getAvailableGenres } from "@/actions/events";
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

  let events: EventWithVenue[] = [];
  let page = 1;
  let totalPages = 1;
  let genres: string[] = [];

  try {
    const [eventsResult, genresResult] = await Promise.all([
      getPublishedEvents(filters),
      getAvailableGenres(),
    ]);
    events = eventsResult.events;
    page = eventsResult.page;
    totalPages = eventsResult.totalPages;
    genres = genresResult;
  } catch {
    // Appwrite may not be reachable or permissions not set — show empty state
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Discover Events</h1>
        <p className="text-muted-foreground">
          Find live music events near you
        </p>
      </div>

      <div className="mt-6">
        <Suspense>
          <EventFilters genres={genres} />
        </Suspense>
      </div>

      <div className="mt-8">
        <Suspense fallback={<SkeletonList count={6} />}>
          <EventGrid events={serialize(events)} />
        </Suspense>
      </div>

      <div className="mt-8">
        <Pagination currentPage={page} totalPages={totalPages} />
      </div>
    </div>
  );
}
