"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DATE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "This weekend", value: "weekend" },
  { label: "This week", value: "week" },
  { label: "This month", value: "month" },
] as const;

interface EventFiltersProps {
  genres: string[];
  /** Render only the search bar (for hero section) */
  heroMode?: boolean;
  /** Render only the date + genre pills (for pills strip) */
  pillsOnly?: boolean;
}

export function EventFilters({
  genres,
  heroMode = false,
  pillsOnly = false,
}: EventFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentGenre = searchParams.get("genre") ?? "";
  const currentDate = searchParams.get("date") ?? "all";
  const currentSearch = searchParams.get("search") ?? "";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`/events?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const hasActiveFilters =
    currentSearch || currentGenre || currentDate !== "all";

  // ─── Hero mode: just the search bar ───
  if (heroMode) {
    return (
      <div className={cn(isPending && "opacity-60 pointer-events-none")}>
        <div className="relative">
          <Search
            className="absolute left-5 top-1/2 size-5 -translate-y-1/2 text-white/30"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search events, artists, or venues..."
            defaultValue={currentSearch}
            aria-label="Search events"
            onChange={(e) => {
              const value = e.target.value;
              const timeout = setTimeout(
                () => updateParams("search", value),
                400
              );
              return () => clearTimeout(timeout);
            }}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-4 pl-13 pr-5 text-base text-foreground placeholder:text-white/30 outline-none backdrop-blur-sm transition-all focus:border-coral/40 focus:bg-white/[0.08] focus:ring-2 focus:ring-coral/15"
          />
        </div>
      </div>
    );
  }

  // ─── Pills-only mode: date + genre as horizontal scroll ───
  if (pillsOnly) {
    return (
      <div
        className={cn(
          "space-y-2.5",
          isPending && "opacity-60 pointer-events-none"
        )}
      >
        {/* Date filters — always visible */}
        <div className="flex items-center gap-2">
          {DATE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateParams("date", option.value)}
              className={cn(
                "filter-btn whitespace-nowrap",
                currentDate === option.value && "active"
              )}
            >
              {option.label}
            </button>
          ))}

          {/* Clear all */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                startTransition(() => {
                  router.push("/events");
                });
              }}
              className="ml-1 flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="size-3" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>

        {/* Genre filters — horizontal scroll */}
        {genres.length > 0 && (
          <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex items-center gap-1.5 pb-1">
              {genres.map((genre) => (
                <button
                  key={genre}
                  onClick={() =>
                    updateParams("genre", currentGenre === genre ? "" : genre)
                  }
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-all",
                    currentGenre === genre
                      ? "border-coral/50 bg-coral/15 text-coral"
                      : "border-border/50 bg-transparent text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Default: full search + pills (fallback) ───
  return (
    <div
      className={cn("space-y-4", isPending && "opacity-60 pointer-events-none")}
    >
      <div className="relative max-w-lg">
        <Search
          className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search events, artists, or venues..."
          defaultValue={currentSearch}
          aria-label="Search events"
          onChange={(e) => {
            const value = e.target.value;
            const timeout = setTimeout(
              () => updateParams("search", value),
              400
            );
            return () => clearTimeout(timeout);
          }}
          className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-base placeholder:text-muted-foreground/60 outline-none transition-all focus:border-coral/40 focus:ring-2 focus:ring-coral/10"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {DATE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => updateParams("date", option.value)}
            className={cn(
              "filter-btn",
              currentDate === option.value && "active"
            )}
          >
            {option.label}
          </button>
        ))}

        {genres.length > 0 && (
          <div className="mx-1 h-7 w-px bg-border" aria-hidden="true" />
        )}

        {genres.map((genre) => (
          <button
            key={genre}
            onClick={() =>
              updateParams("genre", currentGenre === genre ? "" : genre)
            }
            className={cn(
              "genre-pill cursor-pointer",
              currentGenre === genre && "active"
            )}
          >
            {genre}
          </button>
        ))}

        {hasActiveFilters && (
          <button
            onClick={() => {
              startTransition(() => {
                router.push("/events");
              });
            }}
            className="ml-1 flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-3" aria-hidden="true" />
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
