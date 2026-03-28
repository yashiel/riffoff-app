"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Check, X, Star, MessageSquare } from "lucide-react";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import { updateApplicationStatus } from "@/actions/applications";
import { formatDate } from "@/lib/utils";
import type { ApplicationWithArtist } from "@/actions/applications";
import type { ApplicationStatus } from "@/lib/appwrite/types";

interface ApplicationCardProps {
  application: ApplicationWithArtist;
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(newStatus: ApplicationStatus) {
    startTransition(async () => {
      const result = await updateApplicationStatus(application.$id, newStatus);
      if (result.error) {
        alert(result.error);
      }
    });
  }

  const canShortlist = application.status === "submitted";
  const canAccept = application.status === "shortlisted";
  const canReject = application.status === "submitted" || application.status === "shortlisted";

  return (
    <div className="rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--border)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Artist avatar */}
          <div className="flex size-10 items-center justify-center rounded-full bg-coral/10 text-base font-bold text-coral">
            {(application.artist?.displayName ?? "A").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-base font-bold text-foreground">
              {application.artist?.displayName ?? "Unknown Artist"}
            </p>
            <p className="text-base text-muted-foreground">
              Applied {formatDate(application.submittedAt, { dateStyle: "medium" })}
            </p>
          </div>
        </div>
        <StatusBadge status={application.status} />
      </div>

      {/* Notes */}
      {application.notes && (
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {application.notes}
        </p>
      )}

      {/* View detail + Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/dashboard/events/${application.eventId}/applications/${application.$id}`}
          className="inline-flex items-center gap-1.5 rounded bg-coral/10 px-3 py-1.5 text-sm font-medium text-coral transition-colors hover:bg-coral/20"
        >
          <MessageSquare className="size-3" />
          View
        </Link>
        {canShortlist && (
          <button
            onClick={() => handleStatusChange("shortlisted")}
            disabled={isPending}
            className="btn-ghost inline-flex items-center gap-1.5 !py-1.5 !text-sm"
          >
            <Star className="size-3" />
            Shortlist
          </button>
        )}
        {canAccept && (
          <button
            onClick={() => handleStatusChange("accepted")}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded bg-emerald-500/20 px-3 py-1.5 text-sm font-medium uppercase text-emerald-400 transition-colors hover:bg-emerald-500/30"
          >
            <Check className="size-3" />
            Accept
          </button>
        )}
        {canReject && (
          <button
            onClick={() => handleStatusChange("rejected")}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded bg-red-500/10 px-3 py-1.5 text-sm font-medium uppercase text-red-400 transition-colors hover:bg-red-500/20"
          >
            <X className="size-3" />
            Reject
          </button>
        )}
      </div>
    </div>
  );
}
