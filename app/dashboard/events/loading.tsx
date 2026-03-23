export default function EventsLoading() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-40 animate-pulse rounded bg-white/5" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-white/5" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-full bg-white/5" />
      </div>

      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-[rgba(255,255,255,0.06)] p-4"
          >
            <div className="size-16 shrink-0 animate-pulse rounded-lg bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-white/5" />
              <div className="h-3 w-32 animate-pulse rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
