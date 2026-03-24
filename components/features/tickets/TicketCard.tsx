import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin, QrCode } from "lucide-react";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import { formatDate } from "@/lib/utils";
import type { TicketWithDetails } from "@/actions/tickets";

interface TicketCardProps {
  ticket: TicketWithDetails;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const isActive = ticket.status === "active";
  const isCheckedIn = !!ticket.checkedInAt;

  return (
    <Link
      href={`/dashboard/tickets/${ticket.$id}`}
      className="group flex gap-4 rounded-xl border border-[var(--border)] p-4 transition-all hover:border-[var(--border)] hover:bg-[rgba(255,255,255,0.02)]"
    >
      {/* Event image — small thumbnail */}
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg">
        {ticket.event?.coverimageUrl ? (
          <Image
            src={ticket.event.coverimageUrl}
            alt={ticket.event?.title ?? "Event"}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-[#2a2a2a]">
            <span className="text-2xl opacity-15">♪</span>
          </div>
        )}
      </div>

      {/* Ticket info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-[15px] font-bold text-foreground">
            {ticket.event?.title ?? "Event"}
          </h3>
          <StatusBadge status={isCheckedIn ? "checked in" : ticket.status} />
        </div>

        {/* Date */}
        {ticket.event && (
          <div className="mt-1 flex items-center gap-1.5">
            <Calendar className="size-3 text-coral" />
            <span className="text-[13px] text-coral">
              {formatDate(ticket.event.startsAt, { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>
        )}

        {/* Venue */}
        {ticket.venue && (
          <div className="mt-0.5 flex items-center gap-1.5">
            <MapPin className="size-3 text-muted-foreground" />
            <span className="truncate text-[13px] text-muted-foreground">
              {ticket.venue.name}
            </span>
          </div>
        )}

        {/* Tier + Code */}
        <div className="mt-1.5 flex items-center gap-3">
          {ticket.tier && (
            <span className="text-[12px] text-muted-foreground">
              {ticket.tier.name}
            </span>
          )}
          <span className="font-mono text-[12px] font-medium text-foreground/60">
            {ticket.ticketCode}
          </span>
        </div>
      </div>

      {/* QR indicator */}
      {isActive && !isCheckedIn && (
        <div className="flex items-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-coral/10 text-coral transition-colors group-hover:bg-coral/20">
            <QrCode className="size-5" />
          </div>
        </div>
      )}
    </Link>
  );
}
