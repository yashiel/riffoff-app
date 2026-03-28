import { SkeletonCard } from "@/components/features/shared/SkeletonCard";

export default function EventsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header skeleton */}
      <div className="h-8 w-48 animate-pulse rounded bg-muted/80" />
      <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted/80" />

      {/* Filter bar skeleton */}
      <div className="mt-6 flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-24 animate-pulse rounded-full bg-muted/80" />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
