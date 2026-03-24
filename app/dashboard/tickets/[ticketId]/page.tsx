import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Shield } from "lucide-react";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import { QRDisplay } from "@/components/features/tickets/QRDisplay";
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

  // Auth check
  const sessionClient = await createSessionClient();
  if (!sessionClient) notFound();
  const user = await sessionClient.account.get();

  const { databases } = await createAdminClient();

  // Fetch ticket
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

  // Ownership check — return 404 (AUTHZ-04)
  if (ticket.ownerId !== user.$id) notFound();

  // Fetch related data
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

  return (
    <div className="mx-auto max-w-lg">
      {/* Back button */}
      <Link
        href="/dashboard/tickets"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-white"
      >
        <ArrowLeft className="size-3.5" />
        Back to tickets
      </Link>

      {/* Ticket card */}
      <div className="overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#242424]">
        {/* Event image banner */}
        <div className="relative aspect-[21/9] overflow-hidden">
          {event?.coverimageUrl ? (
            <Image
              src={event.coverimageUrl}
              alt={event?.title ?? "Event"}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[#2a2a2a]">
              <span className="text-5xl opacity-10">♪</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#242424] via-transparent to-transparent" />
        </div>

        <div className="p-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <StatusBadge status={isCheckedIn ? "checked in" : ticket.status} />
            {tier && (
              <span className="text-[13px] font-medium text-muted-foreground">
                {tier.name}
              </span>
            )}
          </div>

          {/* Event title */}
          <h1 className="mt-3 font-display text-[30px]">
            {event?.title ?? "Event"}
          </h1>

          {/* Date + Venue */}
          <div className="mt-3 space-y-1.5">
            {event && (
              <div className="flex items-center gap-2">
                <Calendar className="size-3.5 text-coral" />
                <span className="text-[14px] text-coral">
                  {formatDate(event.startsAt, { dateStyle: "full", timeStyle: "short" })}
                </span>
              </div>
            )}
            {venue && (
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5 text-muted-foreground" />
                <span className="text-[14px] text-muted-foreground">
                  {venue.name}
                </span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-6 border-t border-dashed border-[rgba(255,255,255,0.1)]" />

          {/* QR Code or status message */}
          {isActive && !isCheckedIn ? (
            <QRDisplay ticketId={ticket.$id} ticketCode={ticket.ticketCode} />
          ) : isCheckedIn ? (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-6 text-center">
              <p className="text-[16px] font-bold text-blue-400">
                Checked in
              </p>
              <p className="mt-2 text-[13px] text-muted-foreground">
                {ticket.checkedInAt && formatDate(ticket.checkedInAt)}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] p-6 text-center">
              <p className="text-[14px] text-muted-foreground">
                This ticket is {ticket.status}
              </p>
            </div>
          )}

          {/* Trust message */}
          {isActive && !isCheckedIn && (
            <div className="mt-8 flex items-start gap-2 text-[12px]">
              <Shield className="mt-0.5 size-3.5 shrink-0 text-coral" />
              <p className="text-muted-foreground">
                This ticket is cryptographically signed and verified at the door.
                Screenshots will not work — the QR refreshes automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
