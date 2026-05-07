import Link from "next/link";
import { Music, ArrowRight } from "lucide-react";
import { STATUS_META, toneClasses } from "@/lib/applications/status-meta";
import type { ApplicationStatus } from "@/lib/appwrite/types";

interface ApplyToPerformCTAProps {
  eventId: string;
  /** Existing application status, or null if the artist has not applied yet */
  applicationStatus: ApplicationStatus | null;
  /** Application ID — only used when applicationStatus is non-null */
  applicationId?: string | null;
}

const ARTIST_CTA_LABEL: Record<ApplicationStatus, string> = {
  submitted: "Application submitted",
  shortlisted: "You've been shortlisted",
  accepted: "You've been accepted",
  rejected: "Application not selected",
  withdrawn: "Application withdrawn",
};

/**
 * Renders an "Apply to Perform" CTA on the public event page,
 * visible only to signed-in artists.
 *
 * When the artist already has an application for this event, the CTA
 * morphs into a status indicator that links to the application detail page.
 */
export function ApplyToPerformCTA({
  eventId,
  applicationStatus,
  applicationId,
}: ApplyToPerformCTAProps) {
  // No application yet — primary CTA pointing to the apply form
  if (applicationStatus === null) {
    return (
      <Link
        href={`/events/${eventId}/apply`}
        className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-coral/30 bg-coral/5 p-4 transition-colors hover:border-coral/60 hover:bg-coral/10 sm:p-5"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral">
            <Music className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">
              Are you an artist?
            </p>
            <p className="text-sm text-muted-foreground">
              Apply to perform at this event
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-coral">
          Apply <ArrowRight className="size-3" aria-hidden="true" />
        </div>
      </Link>
    );
  }

  // Already applied — pull tone + icon from the shared status meta
  const meta = STATUS_META[applicationStatus];
  const tone = toneClasses(applicationStatus);
  const Icon = meta.Icon;
  const label = ARTIST_CTA_LABEL[applicationStatus];

  const href = applicationId
    ? `/dashboard/applications/${applicationId}`
    : "/dashboard/applications";

  return (
    <Link
      href={href}
      className={`mt-4 flex items-center justify-between gap-3 rounded-2xl border p-4 transition-opacity hover:opacity-90 sm:p-5 ${tone.pill} border-current/30`}
    >
      <div className="flex items-center gap-3">
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        <p className="text-base font-bold">{label}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-sm font-bold uppercase tracking-wide">
        View <ArrowRight className="size-3" aria-hidden="true" />
      </div>
    </Link>
  );
}
