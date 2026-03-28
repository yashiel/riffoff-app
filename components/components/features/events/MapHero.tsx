"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MapPin, X, ChevronDown } from "lucide-react";
import { RegionCitySelector } from "./RegionCitySelector";
import { CITY_DATA } from "@/lib/city-mapping";
import { cn } from "@/lib/utils";

interface CityEventCount {
  cityId: string;
  count: number;
}

interface MapHeroProps {
  cityEvents: CityEventCount[];
  totalEvents: number;
}

export function MapHero({ cityEvents, totalEvents }: MapHeroProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentCity = searchParams.get("city") ?? null;
  const currentSearch = searchParams.get("search") ?? "";
  const [selectorOpen, setSelectorOpen] = useState(!currentCity);

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value) {
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

  const handleCitySelect = useCallback(
    (cityId: string | null) => {
      updateParams("city", cityId);
      if (cityId) {
        setTimeout(() => setSelectorOpen(false), 300);
      }
    },
    [updateParams]
  );

  const handleClearCity = useCallback(() => {
    updateParams("city", null);
    setSelectorOpen(true);
  }, [updateParams]);

  const selectedCityData = currentCity
    ? CITY_DATA.find((c) => c.id === currentCity)
    : null;
  const cityEventCount = currentCity
    ? cityEvents.find((c) => c.cityId === currentCity)?.count ?? 0
    : totalEvents;

  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-border bg-[#0a0a0c]",
        isPending && "pointer-events-none opacity-70"
      )}
    >
      {/* Ambient gradient orbs */}
      <div
        className="pointer-events-none absolute -left-40 -top-40 size-[500px] rounded-full opacity-15 blur-[120px]"
        style={{ background: "var(--coral)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 right-1/4 size-[400px] rounded-full opacity-[0.08] blur-[100px]"
        style={{ background: "#38bdf8" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[0.95] tracking-tighter text-white">
            Find your{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, var(--coral) 0%, #f97316 30%, #fb7185 50%, #a78bfa 75%, #38bdf8 100%)",
              }}
            >
              next show
            </span>
          </h1>
          <p className="mt-2 text-sm text-white/40">
            {totalEvents}+ events worldwide
          </p>
        </div>

        {/* Search bar */}
        <div className="mx-auto mt-5 max-w-md">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/30"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search events, artists, venues..."
              defaultValue={currentSearch}
              aria-label="Search events"
              onChange={(e) => {
                const value = e.target.value;
                const timeout = setTimeout(
                  () => updateParams("search", value || null),
                  400
                );
                return () => clearTimeout(timeout);
              }}
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-coral/40 focus:ring-2 focus:ring-coral/15"
            />
          </div>
        </div>

        {/* City selector OR breadcrumb */}
        <div className="mt-6">
          {selectorOpen ? (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <RegionCitySelector
                cityEvents={cityEvents}
                selectedCity={currentCity}
                onCitySelect={handleCitySelect}
              />
            </div>
          ) : currentCity && selectedCityData ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Collapsed breadcrumb */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-coral/15">
                    <MapPin className="size-4 text-coral" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">
                      {selectedCityData.flag}
                    </span>
                    <span className="font-semibold text-white">
                      {selectedCityData.name}
                    </span>
                    <span className="text-sm text-white/40">·</span>
                    <span className="text-sm text-white/60">
                      {cityEventCount} event
                      {cityEventCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectorOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <ChevronDown className="size-3.5" />
                    <span className="hidden sm:inline">Change</span>
                  </button>
                  <button
                    onClick={handleClearCity}
                    className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Clear city filter"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
