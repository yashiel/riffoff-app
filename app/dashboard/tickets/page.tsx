import { TicketList } from "@/components/features/tickets/TicketList";
import { getUserTickets } from "@/actions/tickets";

export const metadata = { title: "My Tickets" };
export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  let tickets: Awaited<ReturnType<typeof getUserTickets>> = [];
  try {
    tickets = await getUserTickets();
  } catch {
    // Appwrite permission error — show empty state
  }

  return (
    <div>
      <h1 className="font-display text-[28px]">My Tickets</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        Your purchased tickets and e-passes
      </p>
      <div className="mt-8">
        <TicketList tickets={tickets} />
      </div>
    </div>
  );
}
