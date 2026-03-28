import { TicketList } from "@/components/features/tickets/TicketList";
import { TicketListRefresher } from "@/components/features/tickets/TicketListRefresher";
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

  const uncheckedCount = tickets.filter((t: any) => t.status === "active" && !t.checkedInAt).length;

  return (
    <div>
      {/* Auto-refresh when tickets might get scanned */}
      <TicketListRefresher uncheckedCount={uncheckedCount} />

      <h1 className="font-display text-2xl tracking-tight sm:text-3xl lg:text-[40px]">My Tickets</h1>
      <p className="mt-2 text-base text-muted-foreground/80">
        Your purchased tickets and e-passes
      </p>

      {/* Ticket list — priority */}
      <div className="mt-6 sm:mt-10">
        <TicketList tickets={tickets} />
      </div>

      {/* Upcoming events carousel — below tickets */}
      {upcomingEvents.length > 0 && (
        <div className="mt-8 border-t border-border pt-8 sm:mt-12 sm:pt-10">
          <EventCarousel
            events={serialize(upcomingEvents)}
            title="Upcoming Events"
            subtitle="Discover what's happening next"
          />
        </div>
      )}
    </div>
  );
}
