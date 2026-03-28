"use client";

import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { CITY_DATA, type CityId } from "@/lib/city-mapping";

/** SVG coordinates for each city on the map (relative to viewBox 0 0 800 600) */
const CITY_COORDS: Record<string, { x: number; y: number }> = {
  "kuala-lumpur": { x: 390, y: 365 },
  "penang": { x: 370, y: 330 },
  "singapore": { x: 400, y: 385 },
  "bangkok": { x: 370, y: 280 },
  "jakarta": { x: 385, y: 430 },
  "manila": { x: 510, y: 310 },
  "ho-chi-minh": { x: 420, y: 310 },
  "colombo": { x: 230, y: 340 },
  "seoul": { x: 560, y: 140 },
  "tokyo": { x: 620, y: 160 },
  "sarawak": { x: 440, y: 385 },
  "galle": { x: 235, y: 355 },
};

/** Combined city info with coordinates */
const CITIES = CITY_DATA.map((city) => ({
  ...city,
  ...(CITY_COORDS[city.id] ?? { x: 400, y: 300 }),
}));

export type { CityId };

interface CityEventCount {
  cityId: string;
  count: number;
}

interface SEAMapProps {
  /** Number of events per city */
  cityEvents: CityEventCount[];
  /** Currently selected city */
  selectedCity: string | null;
  /** Called when a city dot is clicked */
  onCitySelect: (cityId: string | null) => void;
}

export function SEAMap({ cityEvents, selectedCity, onCitySelect }: SEAMapProps) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  const eventCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const { cityId, count } of cityEvents) {
      map.set(cityId, count);
    }
    return map;
  }, [cityEvents]);

  const totalEvents = useMemo(
    () => cityEvents.reduce((acc, c) => acc + c.count, 0),
    [cityEvents]
  );

  const handleCityClick = useCallback(
    (cityId: string) => {
      onCitySelect(selectedCity === cityId ? null : cityId);
    },
    [selectedCity, onCitySelect]
  );

  return (
    <div className="relative w-full">
      <svg
        viewBox="180 80 520 420"
        className="mx-auto h-auto max-h-[360px] w-full max-w-3xl"
        role="img"
        aria-label="Map of event locations across Asia"
      >
        <defs>
          {/* Glow filter for active dots */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Pulse animation ring */}
          <filter id="glow-strong" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient for connection lines */}
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--coral)" stopOpacity="0.15" />
            <stop offset="50%" stopColor="var(--coral)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--coral)" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* ── Subtle landmass outlines ── */}
        {/* Mainland Southeast Asia (simplified) */}
        <path
          d="M300,120 Q340,100 380,130 Q400,140 420,120 Q460,100 500,140
             L520,180 Q540,200 530,240 Q520,260 500,280
             L480,300 Q460,310 440,300 Q420,310 410,330
             Q400,340 390,350 Q380,360 370,340 Q360,320 340,310
             Q320,300 310,280 Q300,260 290,240 L280,200 Q290,160 300,120Z"
          fill="white"
          fillOpacity="0.02"
          stroke="white"
          strokeOpacity="0.06"
          strokeWidth="0.8"
        />
        {/* Malay Peninsula */}
        <path
          d="M370,310 Q375,320 380,340 Q385,350 390,360
             Q395,370 400,380 Q405,390 395,395
             Q385,390 380,380 Q375,370 370,360
             Q365,340 360,330 Q365,320 370,310Z"
          fill="white"
          fillOpacity="0.02"
          stroke="white"
          strokeOpacity="0.06"
          strokeWidth="0.8"
        />
        {/* Sumatra */}
        <path
          d="M340,380 Q350,370 360,380 Q370,400 380,420
             Q385,440 375,460 Q365,450 355,430
             Q345,410 340,395 Q338,385 340,380Z"
          fill="white"
          fillOpacity="0.02"
          stroke="white"
          strokeOpacity="0.06"
          strokeWidth="0.8"
        />
        {/* Java */}
        <path
          d="M370,430 Q390,425 410,428 Q430,430 450,435
             Q460,438 450,442 Q430,445 410,443
             Q390,440 375,437 Q370,435 370,430Z"
          fill="white"
          fillOpacity="0.02"
          stroke="white"
          strokeOpacity="0.06"
          strokeWidth="0.8"
        />
        {/* Borneo */}
        <path
          d="M420,360 Q440,350 460,360 Q475,370 480,390
             Q475,410 460,415 Q440,420 425,410
             Q415,395 415,380 Q415,370 420,360Z"
          fill="white"
          fillOpacity="0.02"
          stroke="white"
          strokeOpacity="0.06"
          strokeWidth="0.8"
        />
        {/* Philippines */}
        <path
          d="M500,260 Q510,250 515,265 Q518,280 515,295
             Q512,310 505,320 Q500,315 498,300
             Q495,280 498,270 Q500,265 500,260Z"
          fill="white"
          fillOpacity="0.02"
          stroke="white"
          strokeOpacity="0.06"
          strokeWidth="0.8"
        />
        {/* Sri Lanka */}
        <path
          d="M225,325 Q235,320 240,330 Q242,340 238,350
             Q234,355 228,350 Q224,342 223,335 Q224,328 225,325Z"
          fill="white"
          fillOpacity="0.02"
          stroke="white"
          strokeOpacity="0.06"
          strokeWidth="0.8"
        />
        {/* Japan (simplified) */}
        <path
          d="M590,100 Q600,90 615,100 Q625,115 630,140
             Q632,160 628,180 Q624,190 618,185
             Q612,170 608,150 Q605,130 600,120 Q595,110 590,100Z"
          fill="white"
          fillOpacity="0.02"
          stroke="white"
          strokeOpacity="0.06"
          strokeWidth="0.8"
        />
        {/* Korea (simplified) */}
        <path
          d="M555,120 Q560,110 565,120 Q568,135 565,150
             Q562,160 558,155 Q555,145 554,135 Q554,125 555,120Z"
          fill="white"
          fillOpacity="0.02"
          stroke="white"
          strokeOpacity="0.06"
          strokeWidth="0.8"
        />

        {/* ── Connection lines between cities ── */}
        {selectedCity === null &&
          CITIES.filter((c) => eventCountMap.has(c.id) && (eventCountMap.get(c.id) ?? 0) > 0).map((city, i, arr) => {
            if (i === 0) return null;
            const prev = arr[i - 1];
            return (
              <line
                key={`line-${city.id}`}
                x1={prev.x}
                y1={prev.y}
                x2={city.x}
                y2={city.y}
                stroke="url(#line-gradient)"
                strokeWidth="0.5"
                strokeDasharray="4 8"
                opacity={0.4}
              />
            );
          })}

        {/* ── City dots ── */}
        {CITIES.map((city) => {
          const count = eventCountMap.get(city.id) ?? 0;
          if (count === 0) return null;

          const isSelected = selectedCity === city.id;
          const isHovered = hoveredCity === city.id;
          const isActive = isSelected || isHovered;
          const dotSize = Math.min(6 + count * 0.8, 14);

          return (
            <g key={city.id}>
              {/* Pulse ring on active */}
              {isActive && (
                <circle
                  cx={city.x}
                  cy={city.y}
                  r={dotSize + 8}
                  fill="none"
                  stroke="var(--coral)"
                  strokeWidth="1"
                  opacity={0.4}
                >
                  <animate
                    attributeName="r"
                    from={dotSize + 4}
                    to={dotSize + 16}
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.5"
                    to="0"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Glow backdrop */}
              <circle
                cx={city.x}
                cy={city.y}
                r={dotSize + 2}
                fill="var(--coral)"
                opacity={isActive ? 0.25 : 0.1}
                filter="url(#glow)"
              />

              {/* Main dot */}
              <circle
                cx={city.x}
                cy={city.y}
                r={dotSize}
                fill={isSelected ? "var(--coral)" : isHovered ? "var(--coral)" : "#c4ff36"}
                opacity={isActive ? 1 : 0.85}
                filter={isActive ? "url(#glow-strong)" : "url(#glow)"}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setHoveredCity(city.id)}
                onMouseLeave={() => setHoveredCity(null)}
                onClick={() => handleCityClick(city.id)}
                role="button"
                tabIndex={0}
                aria-label={`${city.name}: ${count} event${count !== 1 ? "s" : ""}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCityClick(city.id);
                  }
                }}
              />

              {/* City label — always visible */}
              <text
                x={city.x}
                y={city.y - dotSize - 6}
                textAnchor="middle"
                className={cn(
                  "pointer-events-none select-none fill-current font-sans transition-all duration-200",
                  isActive ? "text-white text-[13px] font-semibold" : "text-white/50 text-[11px] font-medium"
                )}
                style={{ fontSize: isActive ? 13 : 11 }}
              >
                {city.name}
              </text>

              {/* Event count badge on hover/select */}
              {isActive && (
                <g>
                  <rect
                    x={city.x - 20}
                    y={city.y + dotSize + 4}
                    width={40}
                    height={20}
                    rx={10}
                    fill="var(--coral)"
                    opacity={0.9}
                  />
                  <text
                    x={city.x}
                    y={city.y + dotSize + 17}
                    textAnchor="middle"
                    className="pointer-events-none select-none fill-white font-sans font-bold"
                    style={{ fontSize: 11 }}
                  >
                    {count} {count === 1 ? "event" : "events"}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Bottom city quick-select chips */}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => onCitySelect(null)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
            selectedCity === null
              ? "bg-[#c4ff36] text-black"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          All cities · {totalEvents}
        </button>
        {CITIES.filter((c) => (eventCountMap.get(c.id) ?? 0) > 0).map((city) => {
          const count = eventCountMap.get(city.id) ?? 0;
          return (
            <button
              key={city.id}
              onClick={() => handleCityClick(city.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                selectedCity === city.id
                  ? "bg-coral text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              {city.flag} {city.name} · {count}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { CITIES };
