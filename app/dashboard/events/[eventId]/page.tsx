import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar, MapPin, Users, Ticket, Music, Pencil,
  Eye, EyeOff, XCircle, ArrowUpRight, Clock, ChevronRight,
  BarChart3, Shield, Radio, DoorOpen, CheckCircle2,
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

  const [tiers, appsResult, , venueResult, ticketsResult] = await Promise.all([
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
  const ticketDocs = (ticketsResult as { documents: Array<{ checkedInAt: string | null }> }).documents;
  const checkedIn = ticketDocs.filter((t) => t.checkedInAt !== null).length;
  const revenue = tiers.reduce((sum, t) => sum + t.soldCount * t.price, 0);
  const mainCurrency = tiers[0]?.currency ?? "MYR";
  const pendingApps = appsResult.filter((a) => a.status === "submitted").length;
  const acceptedApps = appsResult.filter((a) => a.status === "accepted").length;

  const now = new Date();
  const eventDate = new Date(event.startsAt);
  const isUpcoming = eventDate > now;
  const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / 86400000);
  const isPast = !isUpcoming;
  const daysSince = isPast ? Math.abs(daysUntil) : 0;

  const statusConfig: Record<string, { color: string; label: string }> = {
    draft: { color: "bg-amber-400/15 text-amber-400 border-amber-400/25", label: "Draft" },
    published: { color: "bg-emerald-400/15 text-emerald-400 border-emerald-400/25", label: "Published" },
    completed: { color: "bg-blue-400/15 text-blue-400 border-blue-400/25", label: "Completed" },
    cancelled: { color: "bg-red-400/15 text-red-400 border-red-400/25", label: "Cancelled" },
  };
  const status = statusConfig[event.status] ?? statusConfig.draft;

  return (
    <div className="space-y-6">

      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — IMMERSIVE HERO
          ═══════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: "280px" }}>
        {/* Cover image background */}
        {event.coverimageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.coverimageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f12] via-[#1a1a2e] to-[#0f0f12]">
            {/* Abstract fallback — geometric accent */}
            <div className="absolute right-10 top-10 size-40 rounded-full bg-coral/10 blur-[80px]" />
            <div className="absolute bottom-10 left-1/3 size-32 rounded-full bg-[#FF2D78]/8 blur-[60px]" />
          </div>
        )}

        {/* Top-right: Action buttons (glass morphism) */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2 sm:right-5 sm:top-5">
          <Link
            href={`/dashboard/events/${eventId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white/90 backdrop-blur-md transition-all hover:bg-white/20"
          >
            <Pencil className="size-3.5" /> Edit
          </Link>
          {event.status === "draft" && (
            <form action={async () => { "use server"; await publishEvent(eventId); }}>
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl bg-coral/90 px-4 py-2 text-sm font-bold text-black backdrop-blur-md transition-all hover:bg-coral">
                <Eye className="size-3.5" /> Publish
              </button>
            </form>
          )}
        </div>

        {/* Bottom content overlay */}
        <div className="relative z-[1] flex min-h-[280px] flex-col justify-end p-5 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            {/* Left: Event identity */}
            <div className="max-w-2xl">
              {/* Status badge + countdown badge (mobile) */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${status.color}`}>
                  {event.status === "published" && (
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                  )}
                  {status.label}
                </span>
                {isUpcoming && daysUntil > 0 && daysUntil <= 90 && (
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/70 backdrop-blur-sm lg:hidden">
                    {daysUntil}d away
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="mt-3 font-display text-3xl leading-[0.95] tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] sm:text-4xl lg:text-5xl">
                {event.title}
              </h1>

              {/* Meta: date + venue */}
              <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                <span className="flex items-center gap-1.5 text-sm text-white/80 sm:text-base">
                  <Calendar className="size-3.5 text-coral" />
                  {formatDate(event.startsAt, { dateStyle: "full", timeStyle: "short" })}
                </span>
                {venue && (
                  <span className="flex items-center gap-1.5 text-sm text-white/60 sm:text-base">
                    <MapPin className="size-3.5" />
                    {venue.name}
                  </span>
                )}
              </div>

              {/* Genre pills */}
              {event.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {event.genres.map((g) => (
                    <span key={g} className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/70 backdrop-blur-sm">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Countdown (desktop only) */}
            <div className="hidden shrink-0 text-right lg:block">
              {isUpcoming && daysUntil > 0 ? (
                <div>
                  <p className="font-display text-7xl leading-none text-white/90 drop-shadow-lg">
                    {daysUntil}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                    {daysUntil === 1 ? "Day to go" : "Days to go"}
                  </p>
                </div>
              ) : isUpcoming && daysUntil === 0 ? (
                <div>
                  <p className="font-display text-5xl text-coral drop-shadow-lg">TODAY</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-white/40">Show day</p>
                </div>
              ) : (
                <div>
                  <p className="font-display text-4xl text-white/30">
                    {daysSince === 0 ? "TODAY" : `${daysSince}d ago`}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-white/30">
                    {event.status === "completed" ? "Completed" : "Past"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2 — KEY METRICS (4 prominent stat cards)
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tickets Sold */}
        <div className="relative overflow-hidden rounded-2xl border border-coral/15 bg-gradient-to-br from-coral/[0.06] to-transparent p-5">
          <div className="absolute -right-4 -top-4 size-24 rounded-full bg-coral/[0.06] blur-[40px]" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-xl bg-coral/12">
                <Ticket className="size-5 text-coral" />
              </div>
              <span className="rounded-full bg-coral/10 px-3 py-1 text-sm font-bold tabular-nums text-coral">{soldPercentage}%</span>
            </div>
            <p className="mt-4 font-display text-4xl tabular-nums tracking-tight">
              {totalSold.toLocaleString()}
              <span className="text-lg text-muted-foreground/40">/{totalQuota.toLocaleString()}</span>
            </p>
            <p className="mt-1 text-base text-muted-foreground">Tickets Sold</p>
            {totalQuota > 0 && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-coral to-coral/60" style={{ width: `${soldPercentage}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* Revenue */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-400/10">
            <BarChart3 className="size-5 text-emerald-400" />
          </div>
          <p className="mt-4 font-display text-4xl tabular-nums tracking-tight">
            {formatCurrency(revenue, mainCurrency)}
          </p>
          <p className="mt-1 text-base text-muted-foreground">Revenue</p>
        </div>

        {/* Check-ins */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-400/10">
              <CheckCircle2 className="size-5 text-cyan-400" />
            </div>
            {totalSold > 0 && (
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-sm font-bold tabular-nums text-cyan-400">
                {Math.round((checkedIn / totalSold) * 100)}%
              </span>
            )}
          </div>
          <p className="mt-4 font-display text-4xl tabular-nums tracking-tight">
            {checkedIn}
            <span className="text-lg text-muted-foreground/40">/{totalSold}</span>
          </p>
          <p className="mt-1 text-base text-muted-foreground">Checked In</p>
        </div>

        {/* Applications */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-400/10">
              <Music className="size-5 text-violet-400" />
            </div>
            {pendingApps > 0 && (
              <span className="rounded-full bg-violet-400/15 px-3 py-1 text-sm font-bold text-violet-400">
                {pendingApps} new
              </span>
            )}
          </div>
          <p className="mt-4 font-display text-4xl tabular-nums tracking-tight">{appsResult.length}</p>
          <p className="mt-1 text-base text-muted-foreground">
            Applications{acceptedApps > 0 ? ` · ${acceptedApps} accepted` : ""}
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — ACTION CENTER
          ═══════════════════════════════════════════════════════ */}
      <div>
        <h2 className="mb-5 font-display text-lg tracking-wider text-muted-foreground">Action Center</h2>

        {/* Primary row: Gate Control + Ticket Tiers (large cards with data) */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Gate Control — live monitoring hero */}
          <Link
            href={`/dashboard/events/${eventId}/gate-control`}
            className="group relative overflow-hidden rounded-2xl border border-coral/15 bg-gradient-to-br from-coral/[0.07] via-coral/[0.02] to-transparent p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-coral/30 hover:shadow-[0_12px_40px_-12px] hover:shadow-coral/15"
          >
            <div className="absolute -right-8 -top-8 size-40 rounded-full bg-coral/[0.06] blur-[60px] transition-all group-hover:bg-coral/10" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-coral/15">
                    <Radio className="size-5 text-coral" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-foreground">Gate Control</h3>
                      {event.status === "published" && (
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                          <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-base text-muted-foreground">Real-time check-in monitoring</p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-coral/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-coral/60" />
              </div>

              {/* Embedded stats dashboard */}
              <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-xl bg-background/60 p-2 text-center sm:p-3">
                  <p className="font-display text-xl tabular-nums text-foreground sm:text-3xl">{checkedIn}</p>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-sm">Scanned</p>
                </div>
                <div className="rounded-xl bg-background/60 p-2 text-center sm:p-3">
                  <p className="font-display text-xl tabular-nums text-foreground sm:text-3xl">{totalSold - checkedIn}</p>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-sm">Remaining</p>
                </div>
                <div className="rounded-xl bg-background/60 p-2 text-center sm:p-3">
                  <p className="font-display text-xl tabular-nums text-coral sm:text-3xl">
                    {totalSold > 0 ? Math.round((checkedIn / totalSold) * 100) : 0}%
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-sm">Rate</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Ticket Tiers — visual breakdown */}
          <Link
            href={`/dashboard/events/${eventId}/tiers`}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-coral/20 hover:shadow-[0_12px_40px_-12px] hover:shadow-coral/10"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-coral/10">
                  <Ticket className="size-5 text-coral" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Ticket Tiers</h3>
                  <p className="text-base text-muted-foreground">{tiers.length} tier{tiers.length !== 1 ? "s" : ""} · {totalSold} of {totalQuota} sold</p>
                </div>
              </div>
              <ChevronRight className="size-5 text-muted-foreground/20 transition-all duration-300 group-hover:translate-x-1 group-hover:text-muted-foreground/50" />
            </div>

            {/* Tier bars */}
            {tiers.length > 0 && (
              <div className="mt-5 space-y-3">
                {tiers.slice(0, 4).map((tier) => {
                  const pct = tier.quota > 0 ? Math.round((tier.soldCount / tier.quota) * 100) : 0;
                  return (
                    <div key={tier.$id}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-base font-medium text-foreground">{tier.name}</span>
                        <span className="font-mono text-base tabular-nums text-muted-foreground">
                          {tier.soldCount}/{tier.quota} <span className="text-coral">{pct}%</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-coral/50" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Link>
        </div>

        {/* Secondary row: 4 action links */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionLink
            href={`/dashboard/events/${eventId}/applications`}
            icon={<Music className="size-5" />}
            iconBg="bg-violet-400/10"
            iconColor="text-violet-400"
            hoverColor="hover:border-violet-400/25 hover:shadow-violet-400/10"
            title="Applications"
            subtitle={`${acceptedApps} accepted · ${appsResult.length} total`}
            badge={pendingApps > 0 ? pendingApps : undefined}
          />
          <ActionLink
            href={`/dashboard/events/${eventId}/attendees`}
            icon={<Users className="size-5" />}
            iconBg="bg-cyan-400/10"
            iconColor="text-cyan-400"
            hoverColor="hover:border-cyan-400/25 hover:shadow-cyan-400/10"
            title="Attendees"
            subtitle={`${totalSold} holders · ${checkedIn} checked in`}
          />
          <ActionLink
            href={`/dashboard/events/${eventId}/gates`}
            icon={<DoorOpen className="size-5" />}
            iconBg="bg-emerald-400/10"
            iconColor="text-emerald-400"
            hoverColor="hover:border-emerald-400/25 hover:shadow-emerald-400/10"
            title="Gate Management"
            subtitle="Configure gates & access"
          />
          <ActionLink
            href={`/dashboard/events/${eventId}/edit`}
            icon={<Pencil className="size-5" />}
            iconBg="bg-muted"
            iconColor="text-muted-foreground"
            hoverColor="hover:border-foreground/10 hover:shadow-foreground/5"
            title="Edit Event"
            subtitle="Details, cover & settings"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — EVENT DETAILS PANEL
          ═══════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg tracking-wider text-muted-foreground">Event Details</h2>
          {event.status === "published" && (
            <Link
              href={`/events/${eventId}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-sm font-medium text-coral transition-colors hover:text-coral/80"
            >
              View public page <ArrowUpRight className="size-3" />
            </Link>
          )}
        </div>

        {/* Details grid */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Date & Time">
            <p className="text-foreground">
              {formatDate(event.startsAt, { dateStyle: "full", timeStyle: "short" })}
            </p>
            <p className="text-muted-foreground/70">
              to {formatDate(event.endsAt, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </DetailItem>

          <DetailItem label="Venue">
            <p className="text-foreground">{venue?.name ?? "—"}</p>
            {venue?.address && <p className="text-muted-foreground/70">{venue.address}</p>}
          </DetailItem>

          <DetailItem label="Capacity">
            <p className="text-foreground">{event.capacity.toLocaleString()}</p>
            <p className="text-muted-foreground/70">max attendees</p>
          </DetailItem>

          <DetailItem label="Status">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${status.color}`}>
              {status.label}
            </span>
          </DetailItem>

          <DetailItem label="Type">
            <p className="text-foreground">{event.isFree ? "Free Event (RSVP)" : "Paid Event (Tickets)"}</p>
          </DetailItem>

          <DetailItem label="Genres">
            {event.genres.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {event.genres.map((g) => (
                  <span key={g} className="genre-pill">{g}</span>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground/50">None set</p>
            )}
          </DetailItem>
        </div>

        {/* Description */}
        {event.description && (
          <>
            <div className="my-5 h-px bg-border" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/50">Description</p>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">{event.description}</p>
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — TIER PERFORMANCE
          ═══════════════════════════════════════════════════════ */}
      {tiers.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="border-b border-border bg-muted/40 px-5 py-3">
            <h2 className="font-display text-sm tracking-wider text-muted-foreground">Tier Performance</h2>
          </div>
          <div className="divide-y divide-border">
            {tiers.map((tier) => {
              const tierPct = tier.quota > 0 ? Math.round((tier.soldCount / tier.quota) * 100) : 0;
              return (
                <div key={tier.$id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-foreground">{tier.name}</p>
                    <p className="text-sm text-muted-foreground/70">
                      {formatCurrency(tier.price, tier.currency)}
                    </p>
                  </div>
                  <div className="hidden w-32 sm:block">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-coral/70 transition-all"
                        style={{ width: `${tierPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm tabular-nums text-foreground">{tier.soldCount}/{tier.quota}</p>
                    <p className="text-xs tabular-nums text-muted-foreground/60">{tierPct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — FOOTER ACTIONS (DANGER ZONE)
          ═══════════════════════════════════════════════════════ */}
      {event.status !== "cancelled" && event.status !== "completed" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
          <p className="text-sm text-muted-foreground/50">Status actions</p>
          <div className="flex flex-wrap items-center gap-2">
            {event.status === "published" && (
              <>
                <form action={async () => { "use server"; await unpublishEvent(eventId); }}>
                  <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-amber-400/70 transition-colors hover:bg-amber-400/10 hover:text-amber-400">
                    <EyeOff className="size-3.5" /> Unpublish
                  </button>
                </form>
                <form action={async () => { "use server"; await completeEvent(eventId); }}>
                  <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-blue-400/70 transition-colors hover:bg-blue-400/10 hover:text-blue-400">
                    <Clock className="size-3.5" /> Mark Complete
                  </button>
                </form>
              </>
            )}
            <form action={async () => { "use server"; await cancelEvent(eventId); }}>
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-400/50 transition-colors hover:bg-red-400/10 hover:text-red-400">
                <XCircle className="size-3.5" /> Cancel Event
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Sub-components (co-located, server-rendered)
   ────────────────────────────────────────────────────────── */

function ActionLink({
  href, icon, iconBg, iconColor, hoverColor, title, subtitle, badge,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  hoverColor: string;
  title: string;
  subtitle: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-12px] ${hoverColor}`}
    >
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-base font-semibold text-foreground">{title}</p>
          {badge !== undefined && (
            <span className="flex size-5 items-center justify-center rounded-full bg-violet-400 text-[10px] font-bold text-white">{badge}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/20 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground/50" />
    </Link>
  );
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/50">{label}</p>
      <div className="mt-1.5 text-base">{children}</div>
    </div>
  );
}
