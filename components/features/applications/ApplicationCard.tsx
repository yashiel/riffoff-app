"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X, Star, ArrowRight, Music, Undo2 } from "lucide-react";
import { updateApplicationStatus } from "@/actions/applications";
import {
  STATUS_META,
  toneClasses,
  reversalConfirmMessage,
} from "@/lib/applications/status-meta";
import { StatusActionPill } from "./StatusActionPill";
import { StatusPill } from "./StatusPill";
import { formatDate } from "@/lib/utils";
import type { ApplicationWithArtist } from "@/actions/applications";
import type { ApplicationStatus } from "@/lib/appwrite/types";

interface ApplicationCardProps {
  application: ApplicationWithArtist;
  /** When `compact`, hide the artist's cover-note preview (used inside the
      detail page where the note is rendered separately). */
  compact?: boolean;
}

export function ApplicationCard({ application, compact }: ApplicationCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const status = application.status;
  const meta = STATUS_META[status];
  const tone = toneClasses(status);
  const isWithdrawn = status === "withdrawn";

  function handleStatusChange(newStatus: ApplicationStatus) {
    const confirmMsg = reversalConfirmMessage(status, newStatus);
    if (confirmMsg && !confirm(confirmMsg)) return;
    setError(null);
    startTransition(async () => {
      const result = await updateApplicationStatus(application.$id, newStatus);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <article className="group rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar with status dot */}
        <div className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-coral/20 to-coral/5 text-lg font-bold text-coral ring-1 ring-coral/20">
          {(application.artist?.displayName ?? "A").charAt(0).toUpperCase()}
          <span
            className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-2 ring-card ${tone.dot}`}
            aria-hidden="true"
          />
        </div>

        {/* Identity + status pill */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-base font-bold text-foreground">
              {application.artist?.displayName ?? "Unknown Artist"}
            </p>
            <StatusPill status={status} />
          </div>

          {application.artist?.artistGenres &&
            application.artist.artistGenres.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <Music className="size-3" aria-hidden="true" />
                {application.artist.artistGenres.slice(0, 4).join(" · ")}
              </div>
            )}

          <p className="mt-0.5 text-sm text-muted-foreground">
            Applied {formatDate(application.submittedAt, { dateStyle: "medium" })}
          </p>
        </div>

        {/* Open detail */}
        <Link
          href={`/dashboard/events/${application.eventId}/applications/${application.$id}`}
          className="shrink-0 rounded-lg border border-border/60 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-coral/40 hover:bg-coral/5 hover:text-coral"
          aria-label="Open application detail"
        >
          Open
          <ArrowRight className="ml-1 inline size-3" aria-hidden="true" />
        </Link>
      </div>

      {/* Cover-note preview */}
      {!compact && application.notes && (
        <p className="mt-3 line-clamp-2 rounded-lg bg-muted/30 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
          &ldquo;{application.notes}&rdquo;
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {/* Reversible action row */}
      {!isWithdrawn && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/40 pt-4">
          <StatusActionPill
            label="Shortlist"
            Icon={Star}
            tone="amber"
            isCurrent={status === "shortlisted"}
            disabled={isPending}
            onClick={() => handleStatusChange("shortlisted")}
            currentSuffix="· Current"
          />
          <StatusActionPill
            label="Accept"
            Icon={Check}
            tone="emerald"
            isCurrent={status === "accepted"}
            disabled={isPending}
            onClick={() => handleStatusChange("accepted")}
            currentSuffix="· Current"
          />
          <StatusActionPill
            label="Reject"
            Icon={X}
            tone="rose"
            isCurrent={status === "rejected"}
            disabled={isPending}
            onClick={() => handleStatusChange("rejected")}
            currentSuffix="· Current"
          />
          {status !== "submitted" && (
            <StatusActionPill
              label="Reset"
              Icon={Undo2}
              tone="neutral"
              isCurrent={false}
              disabled={isPending}
              onClick={() => handleStatusChange("submitted")}
            />
          )}
        </div>
      )}

      {isWithdrawn && (
        <p className="mt-4 border-t border-border/40 pt-4 text-sm italic text-muted-foreground">
          {meta.label} — the artist&apos;s own decision. Status changes are disabled.
        </p>
      )}
    </article>
  );
}
