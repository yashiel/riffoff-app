"use client";

import { useCallback, useTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  MapPin,
  Music2,
  Calendar,
  X,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { CITY_DATA, REGIONS, type RegionId } from "@/lib/city-mapping";
import { cn } from "@/lib/utils";

const DATE_OPTIONS = [
  { label: "Any time", value: "all" },
  { label: "Today", value: "today" },
  { label: "This weekend", value: "weekend" },
  { label: "This week", value: "week" },
  { label: "This month", value: "month" },
] as const;

interface CityEventCount {
  cityId: string;
  count: number;
}

interface FilterSidebarProps {
  genres: string[];
  cityEvents: CityEventCount[];
  totalEvents: number;
  /** Mobile: render as sheet content */
  isMobile?: boolean;
  onClose?: () => void;
}

export function FilterSidebar({
  genres,
  cityEvents,
  totalEvents,
  isMobile = false,
  onClose,
}: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentCity = searchParams.get("city") ?? "";
  const currentGenre = searchParams.get("genre") ?? "";
  const currentDate = searchParams.get("date") ?? "all";
  const currentSearch = searchParams.get("search") ?? "";

  const [activeRegion, setActiveRegion] = useState<RegionId>(() => {
    if (currentCity) {
      const city = CITY_DATA.find((c) => c.id === currentCity);
      return city?.region ?? "all";
    }
    return "all";
  });

  const [cityExpanded, setCityExpanded] = useState(true);
  const [genreExpanded, setGenreExpanded] = useState(true);

  const eventCountMap = new Map(cityEvents.map(({ cityId, count }) => [cityId, count]));
  const regionCounts = new Map<string, number>();
  for (const city of CITY_DATA) {
    const count = eventCountMap.get(city.id) ?? 0;
    if (count > 0) {
      regionCounts.set(city.region, (regionCounts.get(city.region) ?? 0) + count);
    }
  }

  const visibleRegions = REGIONS.filter(
    (r) => r.id === "all" || (regionCounts.get(r.id) ?? 0) > 0
  );

  const visibleCities =
    activeRegion === "all"
      ? CITY_DATA.filter((c) => (eventCountMap.get(c.id) ?? 0) > 0)
      : CITY_DATA.filter(
          (c) => c.region === activeRegion && (eventCountMap.get(c.id) ?? 0) > 0
        );

  const activeFilterCount = [currentCity, currentGenre, currentDate !== "all" ? currentDate : ""].filter(Boolean).length;

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

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.push("/events");
    });
    onClose?.();
  }, [router, onClose]);

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        isPending && "pointer-events-none opacity-60"
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="size-4 text-coral" />
          <span className="font-display text-sm font-bold uppercase tracking-widest text-white/80">
            Filters
          </span>
          {activeFilterCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="text-xs font-medium text-white/40 transition-colors hover:text-coral"
            >
              Clear all
            </button>
          )}
          {isMobile && onClose && (
            <button onClick={onClose} className="p-1 text-white/40 hover:text-white">
              <X className="size-5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable filters ── */}
      <div className="flex-1 space-y-1 overflow-y-auto px-5 py-4 scrollbar-none">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/25" />
          <input
            type="search"
            placeholder="Search..."
            defaultValue={currentSearch}
            aria-label="Search events"
            onChange={(e) => {
              const value = e.target.value;
              const timeout = setTimeout(() => updateParams("search", value), 400);
              return () => clearTimeout(timeout);
            }}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/25 outline-none transition-all focus:border-coral/30 focus:bg-white/[0.06]"
          />
        </div>

        {/* ── When ── */}
        <div className="pt-4">
          <button
            onClick={() => {}}
            className="flex w-full items-center gap-2 text-left"
          >
            <Calendar className="size-3.5 text-[#c4ff36]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/50">
              When
            </span>
          </button>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {DATE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updateParams("date", option.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  currentDate === option.value
                    ? "bg-[#c4ff36] text-black"
                    : "bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white/80"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Where ── */}
        <div className="pt-5">
          <button
            onClick={() => setCityExpanded(!cityExpanded)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <MapPin className="size-3.5 text-coral" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/50">
                Where
              </span>
              {currentCity && (
                <span className="rounded bg-coral/20 px-1.5 py-0.5 text-[10px] font-bold text-coral">
                  {CITY_DATA.find((c) => c.id === currentCity)?.name}
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "size-3.5 text-white/30 transition-transform",
                !cityExpanded && "-rotate-90"
              )}
            />
          </button>

          {cityExpanded && (
            <div className="mt-2.5 space-y-2.5">
              {/* Region tabs */}
              <div className="flex flex-wrap gap-1">
                {visibleRegions.map((region) => {
                  const count =
                    region.id === "all"
                      ? totalEvents
                      : regionCounts.get(region.id) ?? 0;
                  return (
                    <button
                      key={region.id}
                      onClick={() => {
                        setActiveRegion(region.id);
                        if (currentCity) {
                          const cityData = CITY_DATA.find((c) => c.id === currentCity);
                          if (cityData && region.id !== "all" && cityData.region !== region.id) {
                            updateParams("city", "");
                          }
                        }
                      }}
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide transition-all",
                        activeRegion === region.id
                          ? "bg-white/15 text-white"
                          : "text-white/30 hover:text-white/60"
                      )}
                    >
                      {region.emoji} {region.name}
                      <span className="ml-1 opacity-50">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* City list */}
              <div className="grid grid-cols-1 gap-0.5">
                {visibleCities.map((city) => {
                  const count = eventCountMap.get(city.id) ?? 0;
                  const isSelected = currentCity === city.id;
                  return (
                    <button
                      key={city.id}
                      onClick={() =>
                        updateParams("city", isSelected ? "" : city.id)
                      }
                      className={cn(
                        "flex items-center justify-between rounded-lg px-2.5 py-2 text-left transition-all",
                        isSelected
                          ? "bg-coral/15 text-white"
                          : "text-white/60 hover:bg-white/[0.06] hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{city.flag}</span>
                        <span className="text-xs font-medium">{city.name}</span>
                      </div>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                          isSelected
                            ? "bg-coral/25 text-coral"
                            : "bg-white/[0.06] text-white/30"
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Genre ── */}
        <div className="pt-5">
          <button
            onClick={() => setGenreExpanded(!genreExpanded)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Music2 className="size-3.5 text-purple-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/50">
                Genre
              </span>
              {currentGenre && (
                <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-400">
                  {currentGenre}
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "size-3.5 text-white/30 transition-transform",
                !genreExpanded && "-rotate-90"
              )}
            />
          </button>

          {genreExpanded && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {genres.map((genre) => (
                <button
                  key={genre}
                  onClick={() =>
                    updateParams("genre", currentGenre === genre ? "" : genre)
                  }
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide transition-all",
                    currentGenre === genre
                      ? "bg-purple-500/20 text-purple-300"
                      : "bg-white/[0.04] text-white/35 hover:bg-white/[0.08] hover:text-white/60"
                  )}
                >
                  {genre}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer stat ── */}
      <div className="border-t border-white/[0.06] px-5 py-3">
        <p className="text-center text-xs font-medium text-white/25">
          {totalEvents} events · {cityEvents.length} cities
        </p>
      </div>
    </div>
  );
}
