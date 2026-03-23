import { Skeleton } from "@/components/ui/skeleton";

export default function EventDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Cover skeleton */}
      <Skeleton className="aspect-[21/9] w-full rounded-xl" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-10 w-3/4" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
