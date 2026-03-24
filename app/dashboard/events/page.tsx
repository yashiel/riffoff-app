import Link from "next/link";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/features/shared/EmptyState";
import { getOrganiserEvents } from "@/actions/events";
import { serialize } from "@/lib/utils";
import { EventListClient } from "@/components/features/events/EventListClient";

export const metadata = { title: "My Events" };
export const dynamic = "force-dynamic";

export default async function OrgEventsPage() {
  let events: Awaited<ReturnType<typeof getOrganiserEvents>> = [];
  try {
    events = await getOrganiserEvents();
  } catch {
    // Permission error
  }

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight sm:text-[40px]">My Events</h1>
          <p className="mt-2 text-[14px] text-foreground/30">
            Manage, publish, and track your events
          </p>
        </div>
        <Link href="/dashboard/events/new" className="btn-primary inline-flex w-fit items-center gap-2 !rounded-xl !px-6 !py-3 !text-[13px]">
          <Plus className="size-4" />
          Create Event
        </Link>
      </div>

      <div className="mt-10">
        {events.length === 0 ? (
          <EmptyState
            title="No events yet"
            description="Create your first event to start selling tickets."
            actionLabel="Create Event"
            actionHref="/dashboard/events/new"
          />
        ) : (
          <EventListClient events={serialize(events)} />
        )}
      </div>
    </div>
  );
}
