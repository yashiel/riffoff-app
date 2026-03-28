import Link from "next/link";
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
      className="group block overflow-hidden rounded-xl border border-border p-3 transition-all hover:bg-muted/30 sm:p-4"
    >
      {/* Mobile: stacked | Desktop: horizontal */}
      <div className="flex gap-3 sm:gap-4">
        {/* Event image — responsive thumbnail */}
        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg sm:size-20">
          {ticket.event?.coverimageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ticket.event.coverimageUrl}
              alt={ticket.event?.title ?? "Event"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-muted">
              <span className="text-xl opacity-15 sm:text-2xl">♪</span>
            </div>
          )}
        </div>

        {/* Ticket info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-sm font-bold text-foreground sm:text-base">
              {ticket.event?.title ?? "Event"}
            </h3>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={isCheckedIn ? "checked in" : ticket.status} />
              {/* QR indicator — inline on mobile */}
              {isActive && !isCheckedIn && (
                <div className="flex size-7 items-center justify-center rounded-full bg-coral/10 text-coral sm:hidden">
                  <QrCode className="size-3.5" />
                </div>
              )}
            </div>
          </div>

          {/* Date */}
          {ticket.event && (
            <div className="mt-0.5 flex items-center gap-1.5 sm:mt-1">
              <Calendar className="size-3 text-coral" />
              <span className="text-sm text-coral sm:text-base">
                {formatDate(ticket.event.startsAt, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
          )}

          {/* Venue — hidden on very small, shown on sm+ */}
          {ticket.venue && (
            <div className="mt-0.5 hidden items-center gap-1.5 sm:flex">
              <MapPin className="size-3 text-muted-foreground" />
              <span className="truncate text-base text-muted-foreground">
                {ticket.venue.name}
              </span>
            </div>
          )}

          {/* Tier + Code */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 sm:mt-1.5">
            {ticket.tier && (
              <span className="text-sm text-muted-foreground sm:text-base">
                {ticket.tier.name}
              </span>
            )}
            <span className="font-mono text-xs font-medium text-muted-foreground/60 sm:text-base sm:text-muted-foreground">
              {ticket.ticketCode}
            </span>
          </div>
        </div>

        {/* QR indicator — desktop only */}
        {isActive && !isCheckedIn && (
          <div className="hidden items-center sm:flex">
            <div className="flex size-10 items-center justify-center rounded-full bg-coral/10 text-coral transition-colors group-hover:bg-coral/20">
              <QrCode className="size-5" />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
