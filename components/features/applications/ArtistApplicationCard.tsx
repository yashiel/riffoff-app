"use client";

import { useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin, X, ArrowRight } from "lucide-react";
import { withdrawApplication } from "@/actions/artist-applications";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { useApplicationRealtime } from "@/hooks/use-application-realtime";
import { StatusPill } from "./StatusPill";
import type { ArtistApplicationWithEvent } from "@/actions/artist-applications";

interface ArtistApplicationCardProps {
  application: ArtistApplicationWithEvent;
}

// Strip the "[DEMO] " prefix from titles for cleaner display
function cleanTitle(title: string): string {
  return title.replace(/^\[DEMO\]\s*/, "");
}

export function ArtistApplicationCard({
  application,
}: ArtistApplicationCardProps) {
  const [isPending, startTransition] = useTransition();

  const liveStatus = useApplicationRealtime({
    applicationId: application.$id,
    initialStatus: application.status,
  });

  const canWithdraw =
    liveStatus === "submitted" || liveStatus === "shortlisted";

  function handleWithdraw() {
    if (!confirm("Withdraw this application? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await withdrawApplication(application.$id);
      if (result.error) alert(result.error);
    });
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:border-border hover:shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        {/* Cover image — left rail on desktop, banner on mobile */}
        {application.event?.coverimageUrl ? (
          <div className="relative aspect-[3/2] w-full shrink-0 overflow-hidden bg-muted sm:aspect-auto sm:w-44">
            <Image
              src={application.event.coverimageUrl}
              alt={application.event?.title ?? "Event cover"}
              fill
              sizes="(max-width: 640px) 100vw, 176px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent sm:bg-gradient-to-r sm:from-black/0 sm:to-transparent" />
          </div>
        ) : (
          <div className="relative aspect-[3/2] w-full shrink-0 bg-gradient-to-br from-coral/15 to-coral/5 sm:aspect-auto sm:w-44" />
        )}

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-5 pl-5 sm:pl-0 sm:py-5 sm:pr-5">
          {/* Title row + status pill */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              {application.event ? (
                <Link
                  href={`/events/${application.eventId}`}
                  className="block truncate font-display text-lg font-bold leading-tight text-foreground transition-colors hover:text-coral sm:text-xl"
                >
                  {cleanTitle(application.event.title)}
                </Link>
              ) : (
                <span className="block font-display text-lg font-bold text-muted-foreground">
                  Event no longer available
                </span>
              )}

              {/* Date · venue meta */}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                {application.event && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar
                      className="size-3 text-coral/70"
                      aria-hidden="true"
                    />
                    {formatDate(application.event.startsAt, {
                      dateStyle: "medium",
                    })}
                  </span>
                )}
                {application.venue && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3" aria-hidden="true" />
                    {cleanTitle(application.venue.name)}
                  </span>
                )}
              </div>
            </div>

            <StatusPill status={liveStatus} />
          </div>

          {/* Cover note preview */}
          {application.notes && (
            <p className="line-clamp-2 rounded-md bg-muted/40 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
              &ldquo;
              {application.notes.replace(/^\[DEMO\]\s*/, "")}
              &rdquo;
            </p>
          )}

          {/* Footer */}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Applied {formatRelativeTime(application.submittedAt)}
            </span>
            <div className="flex items-center gap-1.5">
              {canWithdraw && (
                <button
                  onClick={handleWithdraw}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/5 px-3 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300"
                >
                  <X className="size-3" aria-hidden="true" />
                  {isPending ? "Withdrawing…" : "Withdraw"}
                </button>
              )}
              <Link
                href={`/dashboard/applications/${application.$id}`}
                className="inline-flex items-center gap-1 rounded-full bg-coral/10 px-3 py-1 text-xs font-medium text-coral transition-colors hover:bg-coral/20"
              >
                Open
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
