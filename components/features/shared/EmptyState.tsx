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
    <div className="flex flex-col items-center justify-center rounded border border-[var(--border)] py-20 text-center">
      <p className="text-4xl opacity-15">♪</p>
      <h3 className="mt-4 text-[16px] font-bold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[14px] text-muted-foreground">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="btn-primary mt-6 inline-flex items-center gap-2 !text-[13px]"
        >
          {actionLabel}
          <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
