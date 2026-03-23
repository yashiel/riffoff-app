import { TicketCard } from "./TicketCard";
import { EmptyState } from "@/components/features/shared/EmptyState";
import type { TicketWithDetails } from "@/actions/tickets";

interface TicketListProps {
  tickets: TicketWithDetails[];
}

export function TicketList({ tickets }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <EmptyState
        title="No tickets yet"
        description="Browse events and purchase tickets to see them here."
        actionLabel="Browse Events"
        actionHref="/events"
      />
    );
  }

  // Split into upcoming and past
  const now = new Date();
  const upcoming = tickets.filter(
    (t) => t.event && new Date(t.event.endsAt) >= now,
  );
  const past = tickets.filter(
    (t) => !t.event || new Date(t.event.endsAt) < now,
  );

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <div>
          <h2 className="font-display text-[20px]">Upcoming</h2>
          <div className="mt-4 space-y-3">
            {upcoming.map((ticket) => (
              <TicketCard key={ticket.$id} ticket={ticket} />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="font-display text-[20px] text-muted-foreground">
            Past Events
          </h2>
          <div className="mt-4 space-y-3 opacity-60">
            {past.map((ticket) => (
              <TicketCard key={ticket.$id} ticket={ticket} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
