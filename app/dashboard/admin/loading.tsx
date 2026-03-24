export default function AdminLoading() {
  return (
    <div>
      <div className="h-8 w-48 animate-pulse rounded bg-foreground/5" />
      <div className="mt-2 h-4 w-64 animate-pulse rounded bg-foreground/5" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] p-5">
            <div className="size-5 animate-pulse rounded bg-foreground/5" />
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-foreground/5" />
            <div className="mt-1 h-3 w-28 animate-pulse rounded bg-foreground/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
