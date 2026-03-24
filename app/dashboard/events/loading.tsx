export default function EventsLoading() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-40 animate-pulse rounded bg-foreground/5" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-foreground/5" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-full bg-foreground/5" />
      </div>

      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-[var(--border)] p-4"
          >
            <div className="size-16 shrink-0 animate-pulse rounded-lg bg-foreground/5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-foreground/5" />
              <div className="h-3 w-32 animate-pulse rounded bg-foreground/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
