"use client";

import Link from "next/link";
import { AlertTriangle, CreditCard } from "lucide-react";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import { formatDate, formatRelativeTime, formatCentsToDisplay } from "@/lib/utils";
import type { DisputeDoc } from "@/lib/appwrite/types";

const PROVIDER_ICONS: Record<string, string> = {
  stripe: "S",
  paypal: "P",
  tng: "T",
};

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  paypal: "PayPal",
  tng: "TNG",
};

interface DisputeCardProps {
  dispute: DisputeDoc;
}

export function DisputeCard({ dispute }: DisputeCardProps) {
  const isActionable =
    dispute.status === "open" || dispute.status === "needs_response";
  const deadlineApproaching =
    dispute.deadlineAt &&
    isActionable &&
    new Date(dispute.deadlineAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;

  return (
    <Link
      href={`/dashboard/admin/disputes/${dispute.$id}`}
      className="block rounded-xl border border-[var(--border)] bg-card p-4 transition-colors hover:border-coral/30 hover:bg-[rgba(255,255,255,0.02)]"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left side */}
        <div className="flex items-start gap-3">
          {/* Provider badge */}
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">
            {PROVIDER_ICONS[dispute.provider] ?? "?"}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {PROVIDER_LABELS[dispute.provider] ?? dispute.provider} Dispute
              </span>
              <StatusBadge status={dispute.status} />
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              {dispute.reason
                ? dispute.reason.replace(/_/g, " ")
                : "No reason specified"}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground/70">
              <span className="flex items-center gap-1">
                <CreditCard className="size-3" />
                {formatCentsToDisplay(dispute.amount)}
              </span>
              <span>Opened {formatDate(dispute.openedAt, { dateStyle: "medium" })}</span>
              <span className="font-mono">
                #{dispute.$id.slice(-8)}
              </span>
            </div>
          </div>
        </div>

        {/* Right side — deadline warning */}
        {deadlineApproaching && dispute.deadlineAt && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
            <AlertTriangle className="size-3" />
            <span className="hidden sm:inline">
              Due {formatRelativeTime(dispute.deadlineAt)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
