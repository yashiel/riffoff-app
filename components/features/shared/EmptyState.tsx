import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center overflow-hidden rounded border border-[var(--border)] px-4 py-12 text-center sm:px-6 sm:py-20">
      <p className="text-4xl opacity-15">♪</p>
      <h3 className="mt-4 text-base font-bold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-xs text-base text-muted-foreground sm:max-w-sm sm:text-base">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="btn-primary mt-6 inline-flex items-center gap-2 !text-base"
        >
          {actionLabel}
          <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
