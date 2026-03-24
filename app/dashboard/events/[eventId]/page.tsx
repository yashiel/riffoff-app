import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar, MapPin, Users, Ticket, Music, Download,
  Pencil, Eye, EyeOff, XCircle, ArrowUpRight, Clock,
  ChevronRight, BarChart3,
} from "lucide-react";
import { getEventById } from "@/actions/events";
import { getEventTiers } from "@/actions/tiers";
import { getEventApplications } from "@/actions/applications";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { isCurrentUserAdmin } from "@/lib/auth-utils";
import { formatDate, formatCurrency } from "@/lib/utils";
import { publishEvent, cancelEvent, unpublishEvent, completeEvent } from "@/actions/events";
import { Query } from "node-appwrite";
import type { EventDoc, VenueDoc } from "@/lib/appwrite/types";

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

  // Fetch all data in parallel
  const [tiers, appsResult, rsvpsResult, venueResult, ticketsResult] = await Promise.all([
    getEventTiers(eventId),
    getEventApplications(eventId).catch(() => []),
    databases.listDocuments(DATABASE_ID, COLLECTIONS.RSVPS, [
      Query.equal("eventId", eventId), Query.equal("status", "going"), Query.limit(1),
    ]).catch(() => ({ total: 0 })),
    event.venueId
      ? databases.getDocument(DATABASE_ID, COLLECTIONS.VENUES, event.venueId).catch(() => null)
      : null,
    databases.listDocuments(DATABASE_ID, COLLECTIONS.TICKETS, [
      Query.equal("eventId", eventId), Query.limit(500),
    ]).catch(() => ({ total: 0, documents: [] })),
  ]);

  const venue = venueResult as unknown as VenueDoc | null;
  const totalSold = tiers.reduce((sum, t) => sum + t.soldCount, 0);
  const totalQuota = tiers.reduce((sum, t) => sum + t.quota, 0);
  const soldPercentage = totalQuota > 0 ? Math.round((totalSold / totalQuota) * 100) : 0;
  const checkedIn = (ticketsResult as { documents: Array<{ checkedInAt: string | null }> }).documents.filter(
    (t) => t.checkedInAt !== null,
  ).length;
  const revenue = tiers.reduce((sum, t) => sum + t.soldCount * t.price, 0);
  const mainCurrency = tiers[0]?.currency ?? "MYR";

  const pendingApps = appsResult.filter((a) => a.status === "submitted").length;
  const acceptedApps = appsResult.filter((a) => a.status === "accepted").length;

  const statusColors: Record<string, string> = {
    draft: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    published: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    completed: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    cancelled: "bg-red-400/10 text-red-400 border-red-400/20",
  };

  const isUpcoming = new Date(event.startsAt) > new Date();
  const daysUntil = Math.ceil((new Date(event.startsAt).getTime() - Date.now()) / 86400000);

  return (
    <div className="space-y-8">
      {/* ─── Hero banner with cover image ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-foreground/[0.04]">
        {/* Background image (blurred) */}
        {event.coverimageUrl && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.coverimageUrl}
              alt=""
              className="h-full w-full object-cover opacity-20 blur-2xl scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          </div>
        )}

        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          {/* Cover thumbnail */}
          <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-foreground/[0.05] sm:size-28">
            {event.coverimageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.coverimageUrl} alt={event.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-3xl opacity-10">♪</div>
            )}
          </div>

          {/* Event info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusColors[event.status] ?? statusColors.draft}`}>
                {event.status}
              </span>
              {isUpcoming && daysUntil > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-foreground/30">
                  <Clock className="size-3" />
                  {daysUntil === 1 ? "Tomorrow" : `${daysUntil} days away`}
                </span>
              )}
            </div>
            <h1 className="mt-2 font-display text-xl leading-tight tracking-tight sm:text-2xl">{event.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-foreground/40">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-coral/70" />
                {formatDate(event.startsAt, { dateStyle: "full", timeStyle: "short" })}
              </span>
              {venue && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {venue.name}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
            <Link
              href={`/dashboard/events/${eventId}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground/[0.06] px-3.5 py-2 text-[12px] font-medium text-foreground/70 transition-colors hover:bg-foreground/[0.1] hover:text-foreground"
            >
              <Pencil className="size-3" /> Edit
            </Link>
            {event.status === "draft" && (
              <form action={async () => { "use server"; await publishEvent(eventId); }}>
                <button type="submit" className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-coral px-3.5 py-2 text-[12px] font-bold text-[#0e0e10] transition-colors hover:bg-coral/90">
                  <Eye className="size-3" /> Publish
                </button>
              </form>
            )}
            {event.status === "published" && (
              <>
                <form action={async () => { "use server"; await unpublishEvent(eventId); }}>
                  <button type="submit" className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-400/10 px-3.5 py-2 text-[12px] font-medium text-amber-400 transition-colors hover:bg-amber-400/20">
                    <EyeOff className="size-3" /> Unpublish
                  </button>
                </form>
                <form action={async () => { "use server"; await completeEvent(eventId); }}>
                  <button type="submit" className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-400/10 px-3.5 py-2 text-[12px] font-medium text-blue-400 transition-colors hover:bg-blue-400/20">
                    <Clock className="size-3" /> Mark Complete
                  </button>
                </form>
              </>
            )}
            {event.status !== "cancelled" && event.status !== "completed" && (
              <form action={async () => { "use server"; await cancelEvent(eventId); }}>
                <button type="submit" className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-medium text-red-400/60 transition-colors hover:bg-red-400/10 hover:text-red-400">
                  <XCircle className="size-3" /> Cancel
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ─── Stats row ─── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {/* Tickets sold — with progress bar */}
        <div className="col-span-2 rounded-2xl border border-foreground/[0.04] bg-foreground/[0.015] p-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <Ticket className="size-4 text-coral/60" />
            <span className="text-[11px] font-medium text-coral">{soldPercentage}%</span>
          </div>
          <p className="mt-3 font-display text-2xl tracking-tight">{totalSold}<span className="text-foreground/20">/{totalQuota || "—"}</span></p>
          <p className="text-[11px] text-foreground/30">Tickets sold</p>
          {totalQuota > 0 && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/[0.06]">
              <div className="h-full rounded-full bg-coral transition-all" style={{ width: `${soldPercentage}%` }} />
            </div>
          )}
        </div>

        {/* Revenue */}
        <div className="rounded-2xl border border-foreground/[0.04] bg-foreground/[0.015] p-4">
          <BarChart3 className="size-4 text-emerald-400/60" />
          <p className="mt-3 font-display text-2xl tracking-tight">{formatCurrency(revenue, mainCurrency)}</p>
          <p className="text-[11px] text-foreground/30">Revenue</p>
        </div>

        {/* Applications */}
        <div className="rounded-2xl border border-foreground/[0.04] bg-foreground/[0.015] p-4">
          <Music className="size-4 text-violet-400/60" />
          <p className="mt-3 font-display text-2xl tracking-tight">{appsResult.length}</p>
          <p className="text-[11px] text-foreground/30">
            {pendingApps > 0 ? `${pendingApps} pending` : "Applications"}
          </p>
        </div>

        {/* Check-ins */}
        <div className="rounded-2xl border border-foreground/[0.04] bg-foreground/[0.015] p-4">
          <Users className="size-4 text-cyan-400/60" />
          <p className="mt-3 font-display text-2xl tracking-tight">{checkedIn}<span className="text-foreground/20">/{totalSold || "—"}</span></p>
          <p className="text-[11px] text-foreground/30">Checked in</p>
        </div>

        {/* Capacity */}
        <div className="rounded-2xl border border-foreground/[0.04] bg-foreground/[0.015] p-4">
          <Users className="size-4 text-foreground/20" />
          <p className="mt-3 font-display text-2xl tracking-tight">{event.capacity.toLocaleString()}</p>
          <p className="text-[11px] text-foreground/30">Capacity</p>
        </div>
      </div>

      {/* ─── Quick links grid ─── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href={`/dashboard/events/${eventId}/tiers`}
          className="group flex items-center justify-between rounded-2xl border border-foreground/[0.04] bg-foreground/[0.015] p-4 transition-all hover:border-coral/20 hover:bg-coral/[0.03]"
        >
          <div>
            <div className="flex items-center gap-2">
              <Ticket className="size-4 text-coral/60" />
              <span className="text-[14px] font-semibold text-foreground">Ticket Tiers</span>
            </div>
            <p className="mt-1 text-[12px] text-foreground/30">
              {tiers.length} tier{tiers.length !== 1 ? "s" : ""} configured
            </p>
          </div>
          <ChevronRight className="size-4 text-foreground/15 transition-colors group-hover:text-coral/50" />
        </Link>

        <Link
          href={`/dashboard/events/${eventId}/applications`}
          className="group flex items-center justify-between rounded-2xl border border-foreground/[0.04] bg-foreground/[0.015] p-4 transition-all hover:border-violet-400/20 hover:bg-violet-400/[0.03]"
        >
          <div>
            <div className="flex items-center gap-2">
              <Music className="size-4 text-violet-400/60" />
              <span className="text-[14px] font-semibold text-foreground">Applications</span>
              {pendingApps > 0 && (
                <span className="rounded-full bg-violet-400/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-400">
                  {pendingApps} new
                </span>
              )}
            </div>
            <p className="mt-1 text-[12px] text-foreground/30">
              {acceptedApps} accepted · {appsResult.length} total
            </p>
          </div>
          <ChevronRight className="size-4 text-foreground/15 transition-colors group-hover:text-violet-400/50" />
        </Link>

        <Link
          href={`/dashboard/events/${eventId}/attendees`}
          className="group flex items-center justify-between rounded-2xl border border-foreground/[0.04] bg-foreground/[0.015] p-4 transition-all hover:border-cyan-400/20 hover:bg-cyan-400/[0.03]"
        >
          <div>
            <div className="flex items-center gap-2">
              <Download className="size-4 text-cyan-400/60" />
              <span className="text-[14px] font-semibold text-foreground">Attendees</span>
            </div>
            <p className="mt-1 text-[12px] text-foreground/30">
              {checkedIn}/{totalSold} checked in
            </p>
          </div>
          <ChevronRight className="size-4 text-foreground/15 transition-colors group-hover:text-cyan-400/50" />
        </Link>
      </div>

      {/* ─── Event details summary ─── */}
      <div className="rounded-2xl border border-foreground/[0.04] bg-foreground/[0.015] p-5">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-foreground/40">Event Details</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-[11px] text-foreground/25">Date & Time</p>
            <p className="mt-0.5 text-[13px] text-foreground/70">
              {formatDate(event.startsAt, { dateStyle: "full", timeStyle: "short" })}
            </p>
            <p className="text-[12px] text-foreground/30">
              to {formatDate(event.endsAt, { timeStyle: "short" })}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-foreground/25">Venue</p>
            <p className="mt-0.5 text-[13px] text-foreground/70">{venue?.name ?? "—"}</p>
            {venue?.address && <p className="text-[12px] text-foreground/30">{venue.address}</p>}
          </div>
          <div>
            <p className="text-[11px] text-foreground/25">Genres</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {event.genres.length > 0 ? event.genres.map((g) => (
                <span key={g} className="genre-pill">{g}</span>
              )) : (
                <span className="text-[12px] text-foreground/20">None set</span>
              )}
            </div>
          </div>
          {event.description && (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-[11px] text-foreground/25">Description</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-foreground/50">{event.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Public link ─── */}
      {event.status === "published" && (
        <div className="flex items-center justify-between rounded-2xl border border-foreground/[0.04] bg-foreground/[0.015] p-4">
          <div>
            <p className="text-[12px] text-foreground/30">Public event page</p>
            <p className="mt-0.5 text-[13px] text-foreground/50">{`/events/${eventId}`}</p>
          </div>
          <Link
            href={`/events/${eventId}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-coral transition-colors hover:text-coral/80"
          >
            View live <ArrowUpRight className="size-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
