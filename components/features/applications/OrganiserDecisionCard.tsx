"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Check, X, Star, Undo2, Loader2 } from "lucide-react";
import { updateApplicationStatus } from "@/actions/applications";
import {
  STATUS_META,
  toneClasses,
  reversalConfirmMessage,
} from "@/lib/applications/status-meta";
import { StatusActionPill } from "./StatusActionPill";
import type { ApplicationStatus } from "@/lib/appwrite/types";

interface OrganiserDecisionCardProps {
  applicationId: string;
  initialStatus: ApplicationStatus;
  artistName: string;
}

const ORGANISER_HEADLINES: Record<
  ApplicationStatus,
  { headline: string; description: string }
> = {
  submitted: {
    headline: "Awaiting your decision",
    description:
      "Review the artist's profile and cover note, then choose to shortlist, accept, or reject. You can always change your mind later.",
  },
  shortlisted: {
    headline: "Shortlisted — take a closer look",
    description:
      "You've signalled interest to this artist. Use the message thread to ask follow-up questions before making a final call.",
  },
  accepted: {
    headline: "Added to the lineup",
    description:
      "The artist has been notified and they're now on your event's public lineup. They'll appear on the event page and receive a confirmation email.",
  },
  rejected: {
    headline: "Marked as not selected",
    description:
      "The artist has been politely notified. This decision is reversible — you can shortlist or accept them later if your needs change.",
  },
  withdrawn: {
    headline: "Artist withdrew this application",
    description:
      "The artist pulled out before a decision. You can no longer change the outcome — this is the artist's own choice.",
  },
};

export function OrganiserDecisionCard({
  applicationId,
  initialStatus,
  artistName,
}: OrganiserDecisionCardProps) {
  const [status, setStatus] = useState<ApplicationStatus>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Track the latest server-confirmed status so we only sync when it
  // genuinely changes (e.g. after revalidatePath or external update).
  const lastServerStatus = useRef(initialStatus);
  useEffect(() => {
    if (lastServerStatus.current !== initialStatus) {
      lastServerStatus.current = initialStatus;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus(initialStatus);
    }
  }, [initialStatus]);

  const meta = STATUS_META[status];
  const tone = toneClasses(status);
  const Icon = meta.Icon;
  const isWithdrawn = status === "withdrawn";

  function handleClick(newStatus: ApplicationStatus) {
    const confirmMsg = reversalConfirmMessage(status, newStatus);
    if (confirmMsg && !confirm(confirmMsg)) return;
    setError(null);
    const previous = status;
    setStatus(newStatus);
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, newStatus);
      if (result.error) {
        setError(result.error);
        setStatus(previous);
      }
    });
  }

  const copy = ORGANISER_HEADLINES[status];

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br ${tone.heroBg} p-6 ring-1 sm:p-7 lg:p-8 ${tone.heroRing}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-background/40 ring-1 ${tone.heroRing} ${tone.heroIcon}`}
        >
          <Icon className="size-6" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground/80">
            Status · {meta.organiserLabel}
          </p>
          <h2
            className={`mt-1 font-display text-2xl leading-tight ${tone.heroHeadline}`}
          >
            {copy.headline}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/85">
            {copy.description}{" "}
            <span className="text-muted-foreground">({artistName})</span>
          </p>
        </div>
        {isPending && (
          <Loader2
            className="size-4 shrink-0 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {/* Action row */}
      {!isWithdrawn && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/40 pt-4">
          <p className="mr-auto text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
            Your decision
          </p>
          <StatusActionPill
            label="Shortlist"
            Icon={Star}
            tone="amber"
            isCurrent={status === "shortlisted"}
            disabled={isPending}
            onClick={() => handleClick("shortlisted")}
          />
          <StatusActionPill
            label="Accept"
            Icon={Check}
            tone="emerald"
            isCurrent={status === "accepted"}
            disabled={isPending}
            onClick={() => handleClick("accepted")}
          />
          <StatusActionPill
            label="Reject"
            Icon={X}
            tone="rose"
            isCurrent={status === "rejected"}
            disabled={isPending}
            onClick={() => handleClick("rejected")}
          />
          {status !== "submitted" && (
            <StatusActionPill
              label="Reset"
              Icon={Undo2}
              tone="neutral"
              isCurrent={false}
              disabled={isPending}
              onClick={() => handleClick("submitted")}
            />
          )}
        </div>
      )}
    </section>
  );
}
