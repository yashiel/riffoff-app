"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Calendar, MapPin, X } from "lucide-react";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import { withdrawApplication } from "@/actions/artist-applications";
import { formatDate } from "@/lib/utils";
import type { ArtistApplicationWithEvent } from "@/actions/artist-applications";

interface ArtistApplicationCardProps {
  application: ArtistApplicationWithEvent;
}

export function ArtistApplicationCard({ application }: ArtistApplicationCardProps) {
  const [isPending, startTransition] = useTransition();

  const canWithdraw =
    application.status === "submitted" || application.status === "shortlisted";

  function handleWithdraw() {
    if (!confirm("Withdraw this application? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await withdrawApplication(application.$id);
      if (result.error) alert(result.error);
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--border)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {application.event ? (
            <Link
              href={`/events/${application.eventId}`}
              className="text-base font-bold text-white hover:text-coral transition-colors"
            >
              {application.event.title}
            </Link>
          ) : (
            <span className="text-base font-bold text-foreground">Unknown Event</span>
          )}

          <div className="mt-1 flex items-center gap-3 text-base text-muted-foreground">
            {application.event && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3 text-coral" />
                {formatDate(application.event.startsAt, { dateStyle: "medium" })}
              </span>
            )}
            {application.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {application.venue.name}
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={application.status} />
      </div>

      {application.notes && (
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {application.notes}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between text-base text-muted-foreground">
        <span>Applied {formatDate(application.submittedAt, { dateStyle: "medium" })}</span>
        {canWithdraw && (
          <button
            onClick={handleWithdraw}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded bg-red-500/10 px-3 py-1 text-sm font-medium uppercase text-red-400 transition-colors hover:bg-red-500/20"
          >
            <X className="size-3" />
            {isPending ? "Withdrawing..." : "Withdraw"}
          </button>
        )}
      </div>
    </div>
  );
}
