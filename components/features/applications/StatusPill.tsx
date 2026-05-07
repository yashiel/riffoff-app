import { STATUS_META, toneClasses } from "@/lib/applications/status-meta";
import type { ApplicationStatus } from "@/lib/appwrite/types";

interface StatusPillProps {
  status: ApplicationStatus;
  /** Override the default short label */
  label?: string;
  /** Visual size — "sm" (default) is for inline rows, "md" for hero cards */
  size?: "sm" | "md";
}

/**
 * Compact tinted badge that shows an application status. Pulls all
 * styling from `lib/applications/status-meta` so every page renders
 * statuses identically.
 */
export function StatusPill({ status, label, size = "sm" }: StatusPillProps) {
  const meta = STATUS_META[status];
  const tone = toneClasses(status);
  const Icon = meta.Icon;

  const padding = size === "md" ? "px-3 py-1" : "px-2.5 py-0.5";
  const text = size === "md" ? "text-sm" : "text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 font-medium ${padding} ${text} ${tone.pill}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label ?? meta.label}
    </span>
  );
}
