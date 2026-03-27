"use client";

import { MapPin, X, ChevronDown } from "lucide-react";
import { CITY_DATA } from "@/lib/city-mapping";

interface CityBreadcrumbProps {
  cityId: string;
  eventCount: number;
  onClear: () => void;
  onExpand: () => void;
}

export function CityBreadcrumb({
  cityId,
  eventCount,
  onClear,
  onExpand,
}: CityBreadcrumbProps) {
  const city = CITY_DATA.find((c) => c.id === cityId);
  if (!city) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-coral/15">
          <MapPin className="size-4 text-coral" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">{city.flag}</span>
          <span className="font-semibold text-white">{city.name}</span>
          <span className="text-sm text-white/40">·</span>
          <span className="text-sm text-white/60">
            {eventCount} event{eventCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onExpand}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ChevronDown className="size-3.5" />
          Change city
        </button>
        <button
          onClick={onClear}
          className="flex items-center justify-center rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Clear city filter"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
