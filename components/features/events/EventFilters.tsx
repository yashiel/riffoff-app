"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const DATE_OPTIONS = [
  { label: "All dates", value: "all" },
  { label: "Today", value: "today" },
  { label: "This weekend", value: "weekend" },
  { label: "This week", value: "week" },
  { label: "This month", value: "month" },
] as const;

interface EventFiltersProps {
  genres: string[];
}

export function EventFilters({ genres }: EventFiltersProps) {
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
    [router, searchParams],
  );

  return (
    <div className={cn("space-y-5", isPending && "opacity-50")}>
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search for an event, artist or venue"
          defaultValue={currentSearch}
          aria-label="Search events"
          onChange={(e) => {
            const value = e.target.value;
            const timeout = setTimeout(() => updateParams("search", value), 400);
            return () => clearTimeout(timeout);
          }}
          className="w-full rounded bg-[rgba(255,255,255,0.05)] py-2.5 pl-10 pr-4 text-[14px] text-white placeholder:text-muted-foreground outline-none border border-[rgba(255,255,255,0.1)] focus:border-[rgba(255,255,255,0.3)] transition-colors"
        />
      </div>

      {/* Date + Genre filters row */}
      <div className="flex flex-wrap gap-2">
        {/* Date filters */}
        {DATE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => updateParams("date", option.value)}
            className={cn(
              "filter-btn",
              currentDate === option.value && "active",
            )}
          >
            {option.label}
          </button>
        ))}

        {/* Divider */}
        {genres.length > 0 && (
          <div className="mx-1 h-8 w-px bg-[rgba(255,255,255,0.1)]" />
        )}

        {/* Genre filters */}
        {genres.map((genre) => (
          <button
            key={genre}
            onClick={() =>
              updateParams("genre", currentGenre === genre ? "" : genre)
            }
            className={cn(
              "genre-pill cursor-pointer",
              currentGenre === genre && "active",
            )}
          >
            {genre}
          </button>
        ))}
      </div>
    </div>
  );
}
