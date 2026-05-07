"use client";

import { useTransition, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { withdrawApplication } from "@/actions/artist-applications";
import { useApplicationRealtime } from "@/hooks/use-application-realtime";
import { STATUS_META, toneClasses } from "@/lib/applications/status-meta";
import type { ApplicationStatus } from "@/lib/appwrite/types";

interface ArtistStatusCardProps {
  applicationId: string;
  initialStatus: ApplicationStatus;
}

const ARTIST_HEADLINES: Record<
  ApplicationStatus,
  { headline: string; description: string }
> = {
  submitted: {
    headline: "Your application is in",
    description:
      "The organiser has received your application and will review it soon. You'll see updates here in real time.",
  },
  shortlisted: {
    headline: "You've been shortlisted!",
    description:
      "The organiser is seriously considering you. They may follow up with questions before making a final decision.",
  },
  accepted: {
    headline: "You're on the bill!",
    description:
      "Congratulations — you've been confirmed for this event. Watch the message thread below for soundcheck details and rider forms.",
  },
  rejected: {
    headline: "Not selected this time",
    description:
      "The organiser couldn't fit you on this lineup. Don't be discouraged — strong applications often land the next opportunity.",
  },
  withdrawn: {
    headline: "Application withdrawn",
    description:
      "You withdrew this application. It can no longer be re-opened.",
  },
};

export function ArtistStatusCard({
  applicationId,
  initialStatus,
}: ArtistStatusCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Live status — updates instantly when organiser changes the decision
  const status = useApplicationRealtime({ applicationId, initialStatus });

  const meta = STATUS_META[status];
  const tone = toneClasses(status);
  const Icon = meta.Icon;
  const copy = ARTIST_HEADLINES[status];
  const canWithdraw = status === "submitted" || status === "shortlisted";

  function handleWithdraw() {
    if (
      !confirm(
        "Withdraw this application? This is final — you can't reopen it later.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const result = await withdrawApplication(applicationId);
      if (result.error) setError(result.error);
    });
  }

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
            Status · {meta.artistLabel}
          </p>
          <h2
            className={`mt-1 font-display text-2xl leading-tight ${tone.heroHeadline}`}
          >
            {copy.headline}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/85">
            {copy.description}
          </p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {canWithdraw && (
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-border/40 pt-4">
          <p className="text-xs text-muted-foreground/70">
            Need to pull out? You can still withdraw before a decision is final.
          </p>
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1.5 text-sm font-medium text-rose-700 dark:text-rose-300 transition-all hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <X className="size-3.5" aria-hidden="true" />
            )}
            {isPending ? "Withdrawing…" : "Withdraw"}
          </button>
        </div>
      )}
    </section>
  );
}
