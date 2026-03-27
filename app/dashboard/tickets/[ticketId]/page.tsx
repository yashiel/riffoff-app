import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, CheckCircle2, Clock } from "lucide-react";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { QRDisplay } from "@/components/features/tickets/QRDisplay";
import { WalletButtons } from "@/components/features/tickets/WalletButtons";
import { formatDate } from "@/lib/utils";
import type { TicketDoc, EventDoc, TicketTierDoc, VenueDoc } from "@/lib/appwrite/types";

interface TicketDetailPageProps {
  params: Promise<{ ticketId: string }>;
}

export async function generateMetadata({ params }: TicketDetailPageProps) {
  const { ticketId } = await params;
  return { title: `Ticket ${ticketId.slice(0, 8)}` };
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { ticketId } = await params;

  const sessionClient = await createSessionClient();
  if (!sessionClient) notFound();
  const user = await sessionClient.account.get();

  const { databases } = await createAdminClient();

  let ticket: TicketDoc;
  try {
    ticket = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      ticketId,
    )) as unknown as TicketDoc;
  } catch {
    notFound();
  }

  if (ticket.ownerId !== user.$id) notFound();

  const [eventResult, tierResult] = await Promise.all([
    databases.getDocument(DATABASE_ID, COLLECTIONS.EVENTS, ticket.eventId).catch(() => null),
    ticket.tierId
      ? databases.getDocument(DATABASE_ID, COLLECTIONS.TICKET_TIERS, ticket.tierId).catch(() => null)
      : null,
  ]);

  const event = eventResult as unknown as EventDoc | null;
  const tier = tierResult as unknown as TicketTierDoc | null;

  let venue: VenueDoc | null = null;
  if (event?.venueId) {
    venue = (await databases
      .getDocument(DATABASE_ID, COLLECTIONS.VENUES, event.venueId)
      .catch(() => null)) as unknown as VenueDoc | null;
  }

  const isActive = ticket.status === "active";
  const isCheckedIn = !!ticket.checkedInAt;

  const eventDate = event ? new Date(event.startsAt) : null;
  const day = eventDate?.getDate();
  const monthShort = eventDate?.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const yearFull = eventDate?.getFullYear();
  const weekdayShort = eventDate?.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const time = eventDate?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  // Venue city extraction (e.g. "National Stadium Singapore" → "Singapore")
  const venueCity = venue?.address?.split(",").pop()?.trim() ?? "";
  const venueName = venue?.name ?? "";

  return (
    <div className="mx-auto w-full max-w-[480px]">
      {/* Back */}
      <Link
        href="/dashboard/tickets"
        className="mb-6 inline-flex items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-foreground sm:mb-8"
      >
        <ArrowLeft className="size-3.5" />
        Back to tickets
      </Link>

      {/* ── Boarding Pass ── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:rounded-3xl">

        {/* ── Header bar ── */}
        <div className="flex items-center justify-between border-b border-border bg-coral/5 px-4 py-3 dark:bg-coral/10 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-display)] text-base font-extrabold tracking-tight sm:text-base">
              <span className="text-coral">Riff</span>
              <span className="text-muted-foreground">Off</span>
            </span>
            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">
              Event Pass
            </span>
          </div>
          {/* Status chip */}
          {isCheckedIn ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="size-3" />
              Used
            </span>
          ) : isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-40" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              Valid
            </span>
          ) : (
            <span className="rounded-full bg-muted/80 px-2.5 py-0.5 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {ticket.status}
            </span>
          )}
        </div>

        {/* ── Main body ── */}
        <div className="px-4 pb-0 pt-4 sm:px-6 sm:pt-5">

          {/* Event name — the hero */}
          <h1 className="font-display text-lg leading-tight sm:text-xl">
            {event?.title ?? "Event"}
          </h1>

          {/* ── Boarding pass grid: FROM → TO style ── */}
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:mt-5">
            {/* Date */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/80 sm:text-sm">Date</p>
              <p className="mt-0.5 text-base font-bold tabular-nums text-foreground sm:text-lg">
                {day} {monthShort} {yearFull}
              </p>
              <p className="text-sm text-muted-foreground">{weekdayShort}</p>
            </div>

            {/* Time */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/80 sm:text-sm">Time</p>
              <p className="mt-0.5 text-base font-bold text-foreground sm:text-lg">{time}</p>
              <p className="text-sm text-muted-foreground">Doors open</p>
            </div>

            {/* Venue */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/80 sm:text-sm">Venue</p>
              <p className="mt-0.5 truncate text-base font-semibold text-foreground sm:text-base">{venueName}</p>
              {venueCity && <p className="truncate text-sm text-muted-foreground">{venueCity}</p>}
            </div>

            {/* Tier / Section */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/80 sm:text-sm">Section</p>
              <p className="mt-0.5 text-base font-semibold text-foreground sm:text-base">{tier?.name ?? "General"}</p>
              <p className="text-sm text-muted-foreground">Admission</p>
            </div>
          </div>

          {/* Ticket code bar */}
          <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/80 px-3 py-2 sm:mt-5 sm:px-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/80 sm:text-sm">Ticket</p>
              <p className="font-mono text-base font-bold tracking-widest text-foreground sm:text-base">
                {ticket.ticketCode}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/80 sm:text-sm">Passenger</p>
              <p className="max-w-[120px] truncate text-base font-semibold text-foreground sm:max-w-[160px] sm:text-base">
                {user.name || "Ticket Holder"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Tear perforation ── */}
        <div className="relative my-4 sm:my-5">
          <div className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-background" />
          <div className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-background" />
          <div className="mx-6 border-t border-dashed border-border" />
        </div>

        {/* ── QR stub ── */}
        <div className="px-4 pb-5 sm:px-6 sm:pb-6">
          {isActive && !isCheckedIn ? (
            <QRDisplay ticketId={ticket.$id} ticketCode={ticket.ticketCode} />
          ) : isCheckedIn ? (
            <div className="flex flex-col items-center gap-3 py-4 sm:py-6">
              <div className="flex size-14 items-center justify-center rounded-full bg-blue-500/10 ring-1 ring-blue-500/20 sm:size-16">
                <CheckCircle2 className="size-7 text-blue-500 sm:size-8" />
              </div>
              <div className="text-center">
                <p className="font-display text-base text-muted-foreground">You&apos;re in. Enjoy the show.</p>
                {ticket.checkedInAt && (
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-base text-muted-foreground/80">
                    <Clock className="size-3" />
                    {formatDate(ticket.checkedInAt, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-base text-muted-foreground/80">This ticket is no longer valid</p>
            </div>
          )}

          {/* Wallet buttons */}
          {isActive && !isCheckedIn && event && (
            <div className="mt-5 sm:mt-6">
              <WalletButtons
                ticketId={ticket.$id}
                eventTitle={event.title}
                eventDate={event.startsAt}
                venueName={venueName}
                ticketCode={ticket.ticketCode}
                tierName={tier?.name ?? "General"}
              />
            </div>
          )}

          {/* Security note */}
          {isActive && !isCheckedIn && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/70 px-3 py-2.5 sm:mt-5">
              <Shield className="mt-0.5 size-3.5 shrink-0 text-coral/50" />
              <p className="text-sm leading-relaxed text-muted-foreground/70 sm:text-sm">
                Cryptographically signed. Screenshots won&apos;t work — QR refreshes automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
