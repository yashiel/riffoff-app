"use client";

/**
 * Abstract generative hero background — orbs, grid, equalizer, geometric rings.
 * Uses CSS variables so it auto-adapts to light/dark themes.
 * Pure SVG + CSS — no video, instant load.
 */
export function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-card" />

      {/* Floating orbs — large blurred circles */}
      <div
        className="absolute -left-[10%] top-[10%] size-[500px] rounded-full opacity-[0.15] blur-[100px] sm:size-[600px]"
        style={{ background: "var(--coral)" }}
      />
      <div
        className="absolute -right-[5%] top-[25%] size-[400px] rounded-full opacity-[0.10] blur-[90px] sm:size-[500px]"
        style={{ background: "var(--chart-2)" }}
      />
      <div
        className="absolute bottom-[10%] left-[25%] size-[350px] rounded-full opacity-[0.07] blur-[80px] sm:size-[400px]"
        style={{ background: "var(--chart-3)" }}
      />

      {/* Dot grid pattern */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.025]">
        <defs>
          <pattern id="hero-dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="currentColor" className="text-foreground" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-dots)" />
      </svg>

      {/* Geometric rings — right side */}
      <svg className="absolute right-[5%] top-[12%] size-[280px] opacity-[0.07] sm:right-[8%] sm:size-[380px]" viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="160" stroke="var(--coral)" strokeWidth="0.5" />
        <circle cx="200" cy="200" r="125" stroke="var(--chart-2)" strokeWidth="0.5" strokeDasharray="6 8" className="animate-spin" style={{ animationDuration: "40s" }} />
        <circle cx="200" cy="200" r="90" stroke="var(--coral)" strokeWidth="0.5" strokeDasharray="3 12" className="animate-spin" style={{ animationDuration: "25s", animationDirection: "reverse" }} />
        <circle cx="200" cy="200" r="55" stroke="var(--chart-3)" strokeWidth="0.5" />
        {/* Center dot */}
        <circle cx="200" cy="200" r="3" fill="var(--coral)" opacity="0.4" />
      </svg>

      {/* Equalizer bars — bottom right */}
      <div className="absolute bottom-[15%] right-[10%] hidden items-end gap-[5px] opacity-[0.08] sm:flex">
        {[35, 55, 80, 45, 70, 40, 60, 85, 50, 65, 48, 75, 38, 62].map((h, i) => (
          <div
            key={i}
            className="w-[5px] origin-bottom rounded-full animate-pulse"
            style={{
              height: `${h}px`,
              background: `var(--${i % 3 === 0 ? "coral" : i % 3 === 1 ? "chart-2" : "chart-3"})`,
              animationDuration: `${1.2 + (i % 5) * 0.4}s`,
              animationDelay: `${i * 0.08}s`,
            }}
          />
        ))}
      </div>

      {/* Ticket stub shape — top right corner */}
      <svg className="absolute -right-6 -top-6 size-[180px] opacity-[0.04] sm:size-[250px]" viewBox="0 0 280 320" fill="none">
        <rect x="40" y="10" width="230" height="300" rx="16" stroke="var(--coral)" strokeWidth="1" strokeDasharray="6 6" />
        <line x1="40" y1="70" x2="270" y2="70" stroke="var(--coral)" strokeWidth="0.5" strokeDasharray="4 4" />
        <circle cx="40" cy="70" r="12" fill="var(--background)" stroke="var(--coral)" strokeWidth="0.5" />
        <circle cx="270" cy="70" r="12" fill="var(--background)" stroke="var(--coral)" strokeWidth="0.5" />
      </svg>

      {/* Sound wave at bottom */}
      <svg
        className="absolute bottom-0 left-0 h-[30%] w-full opacity-[0.03]"
        viewBox="0 0 1440 300"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 200 Q120 140 240 200 T480 200 T720 200 T960 200 T1200 200 T1440 200 V300 H0Z"
          fill="var(--coral)"
        />
        <path
          d="M0 230 Q180 170 360 230 T720 230 T1080 230 T1440 230 V300 H0Z"
          fill="var(--foreground)"
          opacity="0.3"
        />
      </svg>

      {/* Bottom fade to page */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
