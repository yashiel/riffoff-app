import { TicketList } from "@/components/features/tickets/TicketList";
import { EventCarousel } from "@/components/features/events/EventCarousel";
import { getUserTickets } from "@/actions/tickets";
import { getUpcomingEvents } from "@/actions/events";
import { serialize } from "@/lib/utils";

export const metadata = { title: "My Tickets" };
export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const [tickets, upcomingEvents] = await Promise.all([
    getUserTickets().catch(() => []),
    getUpcomingEvents().catch(() => []),
  ]);

  return (
    <div>
      <h1 className="font-display text-[32px] tracking-tight">My Tickets</h1>
      <p className="mt-1 text-[13px] text-white/30">
        Your purchased tickets and e-passes
      </p>

      {/* Upcoming events carousel */}
      {upcomingEvents.length > 0 && (
        <div className="mt-8">
          <EventCarousel
            events={serialize(upcomingEvents)}
            title="Upcoming Events"
            subtitle="Discover what's happening next"
          />
        </div>
      )}

      {/* Ticket list */}
      <div className="mt-10">
        <TicketList tickets={tickets} />
      </div>
    </div>
  );
}
