import { SkeletonList } from "@/components/features/shared/SkeletonCard";

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <SkeletonList count={3} />
    </div>
  );
}
