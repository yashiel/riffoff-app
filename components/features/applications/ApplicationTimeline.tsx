import { Undo2 } from "lucide-react";
import { STATUS_META, toneClasses } from "@/lib/applications/status-meta";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/appwrite/types";

interface AuditEntry {
  id: string;
  createdAt: string;
  /** e.g. "application.submitted", "application.shortlisted", … */
  action: string;
}

interface ApplicationTimelineProps {
  currentStatus: ApplicationStatus;
  submittedAt: string;
  auditLog: AuditEntry[];
}

/** Map an audit-log `action` string back to an ApplicationStatus when possible */
function statusFromAction(action: string): ApplicationStatus | null {
  const suffix = action.startsWith("application.")
    ? action.slice("application.".length)
    : null;
  if (!suffix) return null;
  if (
    suffix === "submitted" ||
    suffix === "shortlisted" ||
    suffix === "accepted" ||
    suffix === "rejected" ||
    suffix === "withdrawn"
  ) {
    return suffix;
  }
  return null;
}

/**
 * Pure visual component — renders the audit-log history of an application
 * as a vertical timeline.
 *
 * If the audit log is empty we synthesise the initial "Submitted" entry from
 * the application's submittedAt so the timeline never appears blank.
 */
export function ApplicationTimeline({
  submittedAt,
  auditLog,
}: ApplicationTimelineProps) {
  const entries: AuditEntry[] =
    auditLog.length > 0
      ? auditLog
      : [
          {
            id: "synthetic-submitted",
            createdAt: submittedAt,
            action: "application.submitted",
          },
        ];

  return (
    <ol className="relative space-y-3">
      {entries.map((entry, idx) => {
        const status = statusFromAction(entry.action);
        const meta = status ? STATUS_META[status] : null;
        const tone = status ? toneClasses(status) : null;
        const Icon = meta?.Icon ?? Undo2;
        const label =
          meta?.label === "Withdrawn"
            ? "Withdrawn by artist"
            : meta?.label ?? entry.action.replace(/^application\./, "");
        const iconTone = tone?.heroIcon ?? "text-muted-foreground";
        const isLast = idx === entries.length - 1;

        return (
          <li key={entry.id} className="relative flex gap-3">
            {!isLast && (
              <span
                className="absolute left-[11px] top-6 h-[calc(100%+0.25rem)] w-px bg-border/60"
                aria-hidden="true"
              />
            )}
            <div
              className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-card ring-1 ring-border/60 ${iconTone}`}
            >
              <Icon className="size-3" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(entry.createdAt)} ·{" "}
                {formatDate(entry.createdAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
