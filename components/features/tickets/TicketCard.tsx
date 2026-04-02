import Link from "next/link";
import { Calendar, MapPin, QrCode, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import { formatDate, cn } from "@/lib/utils";
import type { TicketWithDetails } from "@/actions/tickets";

interface TicketCardProps {
  ticket: TicketWithDetails;
  upNext?: boolean;
}

export function TicketCard({ ticket, upNext = false }: TicketCardProps) {
  const isActive = ticket.status === "active";
  const isCheckedIn = !!ticket.checkedInAt;
  const isRefunded = ticket.status === "refunded";
  const statusLabel = isCheckedIn ? "checked in" : ticket.status;

  return (
    <Link
      href={`/dashboard/tickets/${ticket.$id}`}
      className="group block"
      aria-label={`${ticket.event?.title ?? "Ticket"} — ${statusLabel}`}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border transition-all duration-300",
          "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30",
          upNext
            ? "border-coral/30 hover:border-coral/50"
            : isCheckedIn
              ? "border-emerald-500/15 hover:border-emerald-500/30"
              : "border-border/60 hover:border-border/80",
          isRefunded && "opacity-50",
        )}
      >
        {/* Ambient glow from event image */}
        {ticket.event?.coverimageUrl && (
          <div className="pointer-events-none absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ticket.event.coverimageUrl}
              alt=""
              aria-hidden
              className="h-full w-full scale-125 object-cover opacity-[0.05] blur-3xl"
            />
          </div>
        )}

        {/* Left accent bar */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-[3px]",
            upNext
              ? "bg-coral"
              : isActive && !isCheckedIn
                ? "bg-coral/40"
                : isCheckedIn
                  ? "bg-emerald-500"
                  : "bg-border/30",
          )}
        />

        {/* Card body — fixed height via items-center, no justify-between */}
        <div className="relative flex items-center">
          {/* ── Thumbnail ── */}
          <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden sm:h-20 sm:w-24">
            {ticket.event?.coverimageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ticket.event.coverimageUrl}
                  alt={ticket.event.title ?? "Event"}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/80" />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted/30">
                <span className="text-xl opacity-10">♪</span>
              </div>
            )}
          </div>

          {/* ── Content — vertically centered, tight stacking ── */}
          <div className="flex min-w-0 flex-1 flex-col gap-1 px-3.5 py-3 sm:px-4">
            {/* Row 1: title + status */}
            <div className="flex items-center gap-2">
              {/* Pulse dot for up-next */}
              {upNext && (
                <span className="relative flex size-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-coral" />
                </span>
              )}
              <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-foreground sm:text-[17px]">
                {ticket.event?.title ?? "Event"}
              </h3>
              <StatusBadge status={statusLabel} className="shrink-0" />
            </div>

            {/* Row 2: date + venue + up-next label */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0">
              {upNext && (
                <span className="text-xs font-bold uppercase tracking-widest text-coral">
                  Up Next
                </span>
              )}
              {ticket.event && (
                <div className="flex items-center gap-1">
                  <Calendar className="size-3 shrink-0 text-coral" />
                  <span className="text-sm text-coral sm:text-base">
                    {formatDate(ticket.event.startsAt, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              )}
              {ticket.venue && (
                <div className="hidden items-center gap-1 sm:flex">
                  <MapPin className="size-3 shrink-0 text-muted-foreground/40" />
                  <span className="max-w-[200px] truncate text-sm text-muted-foreground/55 sm:text-base">
                    {ticket.venue.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Stub — dashed left border, tier + code + action ── */}
          <div className="flex shrink-0 items-center gap-3 self-stretch border-l border-dashed border-border/40 px-3 sm:px-4">
            {/* Tier + code stacked */}
            <div className="flex flex-col items-end gap-0.5">
              {ticket.tier && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 sm:text-xs">
                  {ticket.tier.name}
                </span>
              )}
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground/35 sm:text-xs">
                {ticket.ticketCode}
              </span>
            </div>

            {/* Icon */}
            {isActive && !isCheckedIn ? (
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full transition-all group-hover:scale-110",
                  upNext
                    ? "bg-coral/15 text-coral group-hover:bg-coral/25"
                    : "bg-muted/60 text-muted-foreground/50 group-hover:bg-coral/10 group-hover:text-coral",
                )}
              >
                <QrCode className="size-3.5 sm:size-4" />
              </div>
            ) : isCheckedIn ? (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="size-4" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
