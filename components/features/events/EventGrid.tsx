import { EventCard } from "./EventCard";
import { EmptyState } from "@/components/features/shared/EmptyState";
import type { EventWithVenue } from "@/actions/events";

interface EventGridProps {
  events: EventWithVenue[];
  wishlistedIds?: string[];
  convertedPrices?: Record<string, string>;
}

export function EventGrid({ events, wishlistedIds = [], convertedPrices = {} }: EventGridProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No events found"
        description="Try adjusting your filters or check back later for new events."
      />
    );
  }

  const wishlistSet = new Set(wishlistedIds);

  return (
    <div className="grid gap-x-6 gap-y-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard
          key={event.$id}
          event={event}
          initialWishlisted={wishlistSet.has(event.$id)}
          convertedPrice={convertedPrices[event.$id] ?? null}
        />
      ))}
    </div>
  );
}
