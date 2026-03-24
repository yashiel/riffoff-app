import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Users, Ticket, Music, Download } from "lucide-react";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import { getEventById } from "@/actions/events";
import { getEventTiers } from "@/actions/tiers";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { isCurrentUserAdmin } from "@/lib/auth-utils";
import { formatDate } from "@/lib/utils";
import { publishEvent, cancelEvent, unpublishEvent } from "@/actions/events";
import { Query } from "node-appwrite";
import type { EventDoc } from "@/lib/appwrite/types";

interface ManageEventPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: ManageEventPageProps) {
  const { eventId } = await params;
  const event = await getEventById(eventId);
  return { title: event ? `Manage: ${event.title}` : "Event Not Found" };
}

export default async function ManageEventPage({ params }: ManageEventPageProps) {
  const { eventId } = await params;

  const sessionClient = await createSessionClient();
  if (!sessionClient) notFound();
  const user = await sessionClient.account.get();

  const { databases } = await createAdminClient();

  let event: EventDoc;
  try {
    event = (await databases.getDocument(
      DATABASE_ID, COLLECTIONS.EVENTS, eventId,
    )) as unknown as EventDoc;
  } catch {
    notFound();
  }

  const adminManage = await isCurrentUserAdmin();
  if (event.organiserId !== user.$id && !adminManage) notFound();

  const tiers = await getEventTiers(eventId);

  // Stats
  const [appsResult, rsvpsResult] = await Promise.all([
    databases.listDocuments(DATABASE_ID, COLLECTIONS.APPLICATIONS, [
      Query.equal("eventId", eventId), Query.limit(1),
    ]).catch(() => ({ total: 0 })),
    databases.listDocuments(DATABASE_ID, COLLECTIONS.RSVPS, [
      Query.equal("eventId", eventId), Query.equal("status", "going"), Query.limit(1),
    ]).catch(() => ({ total: 0 })),
  ]);

  const totalSold = tiers.reduce((sum, t) => sum + t.soldCount, 0);
  const totalQuota = tiers.reduce((sum, t) => sum + t.quota, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="font-display text-xl sm:text-[28px]">{event.title}</h1>
            <StatusBadge status={event.status} />
          </div>
          <div className="mt-2 flex items-center gap-4 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="size-3 text-coral" />
              {formatDate(event.startsAt, { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/events/${eventId}/edit`}
            className="btn-ghost !py-2 !text-[12px] inline-flex items-center gap-1"
          >
            Edit Details
          </Link>
          {event.status === "draft" && (
            <form action={async () => { "use server"; await publishEvent(eventId); }}>
              <button type="submit" className="btn-primary !py-2 !text-[12px]">
                Publish Event
              </button>
            </form>
          )}
          {event.status === "published" && (
            <form action={async () => { "use server"; await unpublishEvent(eventId); }}>
              <button
                type="submit"
                className="rounded border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[12px] font-medium uppercase text-amber-400 transition-colors hover:bg-amber-500/20"
              >
                Unpublish
              </button>
            </form>
          )}
          {event.status !== "cancelled" && (
            <form action={async () => { "use server"; await cancelEvent(eventId); }}>
              <button
                type="submit"
                className="rounded border border-red-500/20 bg-red-500/10 px-4 py-2 text-[12px] font-medium uppercase text-red-400 transition-colors hover:bg-red-500/20"
              >
                Cancel Event
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: "Tickets Sold", value: `${totalSold}/${totalQuota || "—"}`, icon: Ticket },
          { label: "Applications", value: String(appsResult.total), icon: Music },
          { label: "RSVPs (Going)", value: String(rsvpsResult.total), icon: Users },
          { label: "Capacity", value: String(event.capacity), icon: Users },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[rgba(255,255,255,0.06)] p-4"
          >
            <stat.icon className="size-4 text-coral" />
            <p className="mt-2 font-display text-[24px]">{stat.value}</p>
            <p className="text-[12px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="mt-8 flex gap-2 border-b border-[rgba(255,255,255,0.06)] pb-0">
        {[
          { label: "Tiers", href: `/dashboard/events/${eventId}/tiers`, icon: Ticket },
          { label: "Applications", href: `/dashboard/events/${eventId}/applications`, icon: Music },
          { label: "Attendees", href: `/dashboard/events/${eventId}/attendees`, icon: Download },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex items-center gap-1.5 border-b-2 border-transparent px-4 py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:border-coral hover:text-white"
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
