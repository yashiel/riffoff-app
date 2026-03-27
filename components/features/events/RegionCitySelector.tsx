"use client";

import { useState, useCallback, useMemo } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { CITY_DATA, REGIONS, type RegionId } from "@/lib/city-mapping";

interface CityEventCount {
  cityId: string;
  count: number;
}

interface RegionCitySelectorProps {
  cityEvents: CityEventCount[];
  selectedCity: string | null;
  onCitySelect: (cityId: string | null) => void;
}

export function RegionCitySelector({
  cityEvents,
  selectedCity,
  onCitySelect,
}: RegionCitySelectorProps) {
  // Auto-detect region from selected city, or start with the region that has the most events
  const selectedCityData = CITY_DATA.find((c) => c.id === selectedCity);

  const eventCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const { cityId, count } of cityEvents) {
      map.set(cityId, count);
    }
    return map;
  }, [cityEvents]);

  // Count events per region
  const regionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const city of CITY_DATA) {
      const count = eventCountMap.get(city.id) ?? 0;
      if (count > 0) {
        counts.set(city.region, (counts.get(city.region) ?? 0) + count);
      }
    }
    return counts;
  }, [eventCountMap]);

  // Find the region with the most events as default
  const defaultRegion = useMemo(() => {
    let maxRegion = "all" as RegionId;
    let maxCount = 0;
    for (const [region, count] of regionCounts) {
      if (count > maxCount) {
        maxCount = count;
        maxRegion = region as RegionId;
      }
    }
    return maxRegion;
  }, [regionCounts]);

  const [activeRegion, setActiveRegion] = useState<RegionId>(
    selectedCityData?.region ?? defaultRegion
  );

  const totalEvents = useMemo(
    () => cityEvents.reduce((acc, c) => acc + c.count, 0),
    [cityEvents]
  );

  // Cities to show based on active region
  const visibleCities = useMemo(() => {
    if (activeRegion === "all") {
      return CITY_DATA.filter((c) => (eventCountMap.get(c.id) ?? 0) > 0);
    }
    return CITY_DATA.filter(
      (c) => c.region === activeRegion && (eventCountMap.get(c.id) ?? 0) > 0
    );
  }, [activeRegion, eventCountMap]);

  // Only show regions that have events (plus "all")
  const visibleRegions = useMemo(
    () => REGIONS.filter((r) => r.id === "all" || (regionCounts.get(r.id) ?? 0) > 0),
    [regionCounts]
  );

  const handleRegionClick = useCallback(
    (regionId: RegionId) => {
      setActiveRegion(regionId);
      // Clear city selection when switching regions
      if (selectedCity) {
        const cityData = CITY_DATA.find((c) => c.id === selectedCity);
        if (cityData && regionId !== "all" && cityData.region !== regionId) {
          onCitySelect(null);
        }
      }
    },
    [selectedCity, onCitySelect]
  );

  const handleCityClick = useCallback(
    (cityId: string) => {
      onCitySelect(selectedCity === cityId ? null : cityId);
    },
    [selectedCity, onCitySelect]
  );

  return (
    <div className="space-y-4">
      {/* ── Region tabs ── */}
      <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-1.5">
          {visibleRegions.map((region) => {
            const count =
              region.id === "all"
                ? totalEvents
                : regionCounts.get(region.id) ?? 0;
            const isActive = activeRegion === region.id;

            return (
              <button
                key={region.id}
                onClick={() => handleRegionClick(region.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white text-black shadow-lg shadow-white/10"
                    : "bg-white/[0.06] text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                <span className="text-base">{region.emoji}</span>
                <span>{region.name}</span>
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    isActive
                      ? "bg-black/10 text-black/70"
                      : "bg-white/10 text-white/40"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── City chips grid ── */}
      <div className="flex flex-wrap gap-2">
        {/* "All" chip when region is not "all" */}
        {activeRegion !== "all" && (
          <button
            onClick={() => onCitySelect(null)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-200",
              !selectedCity
                ? "border-[#c4ff36]/50 bg-[#c4ff36]/10 text-[#c4ff36]"
                : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white/80"
            )}
          >
            <MapPin className="size-3.5" />
            <span>
              All{" "}
              {visibleRegions.find((r) => r.id === activeRegion)?.name}
            </span>
            <span className="text-xs opacity-60">
              {regionCounts.get(activeRegion) ?? 0}
            </span>
          </button>
        )}

        {visibleCities.map((city) => {
          const count = eventCountMap.get(city.id) ?? 0;
          const isSelected = selectedCity === city.id;

          return (
            <button
              key={city.id}
              onClick={() => handleCityClick(city.id)}
              className={cn(
                "group flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-200",
                isSelected
                  ? "border-coral/50 bg-coral/15 text-white shadow-lg shadow-coral/5"
                  : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              )}
            >
              <span className="text-base leading-none">{city.flag}</span>
              <span>{city.name}</span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums transition-colors",
                  isSelected
                    ? "bg-coral/20 text-coral"
                    : "bg-white/10 text-white/40 group-hover:text-white/60"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty state for regions with no events */}
      {visibleCities.length === 0 && activeRegion !== "all" && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-white/10 py-8">
          <p className="text-sm text-white/30">
            No events in{" "}
            {visibleRegions.find((r) => r.id === activeRegion)?.name} yet
          </p>
        </div>
      )}
    </div>
  );
}
