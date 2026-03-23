import Link from "next/link";
import { Plus, Calendar, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import { EmptyState } from "@/components/features/shared/EmptyState";
import { getOrganiserEvents } from "@/actions/events";
import { formatDate } from "@/lib/utils";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px]">My Events</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Create and manage your events
          </p>
        </div>
        <Link href="/dashboard/events/new" className="btn-primary inline-flex items-center gap-1.5">
          <Plus className="size-4" />
          Create Event
        </Link>
      </div>

      <div className="mt-8">
        {events.length === 0 ? (
          <EmptyState
            title="No events yet"
            description="Create your first event to start selling tickets."
            actionLabel="Create Event"
            actionHref="/dashboard/events/new"
          />
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Link
                key={event.$id}
                href={`/dashboard/events/${event.$id}`}
                className="flex items-center gap-4 rounded-xl border border-[rgba(255,255,255,0.06)] p-4 transition-all hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.02)]"
              >
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-[#2a2a2a]">
                  {event.coverimageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.coverimageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xl opacity-15">♪</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[15px] font-bold text-white">{event.title}</h3>
                    <StatusBadge status={event.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-[13px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3 text-coral" />
                      {formatDate(event.startsAt, { dateStyle: "medium" })}
                    </span>
                    {event.venue && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {event.venue.name}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[13px] text-muted-foreground">Manage →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
