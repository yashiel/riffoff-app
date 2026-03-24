"use client";

/**
 * Abstract hero background with gradient orbs, grid, and geometric elements.
 * Dark overlay ensures text readability in both light and dark themes.
 */
export function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Solid dark base — hero is ALWAYS dark for dramatic impact */}
      <div className="absolute inset-0 bg-[#08080a]" />

      {/* Vivid gradient orbs */}
      <div className="absolute -left-[10%] top-[5%] size-[500px] rounded-full bg-[#FF2D78] opacity-20 blur-[120px] sm:size-[700px]" />
      <div className="absolute -right-[5%] top-[20%] size-[400px] rounded-full bg-[#00D4FF] opacity-15 blur-[100px] sm:size-[600px]" />
      <div className="absolute bottom-[5%] left-[20%] size-[350px] rounded-full bg-[#BFFF00] opacity-10 blur-[100px] sm:size-[500px]" />

      {/* Dot grid */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.04]">
        <defs>
          <pattern id="hero-dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-dots)" />
      </svg>

      {/* Geometric rings */}
      <svg className="absolute right-[5%] top-[12%] size-[280px] opacity-10 sm:right-[8%] sm:size-[400px]" viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="160" stroke="#FF2D78" strokeWidth="0.5" />
        <circle cx="200" cy="200" r="125" stroke="#00D4FF" strokeWidth="0.5" strokeDasharray="6 8" className="animate-spin" style={{ animationDuration: "40s" }} />
        <circle cx="200" cy="200" r="90" stroke="#FF2D78" strokeWidth="0.5" strokeDasharray="3 12" className="animate-spin" style={{ animationDuration: "25s", animationDirection: "reverse" }} />
        <circle cx="200" cy="200" r="55" stroke="#BFFF00" strokeWidth="0.5" />
        <circle cx="200" cy="200" r="3" fill="#FF2D78" opacity="0.5" />
      </svg>

      {/* Equalizer bars */}
      <div className="absolute bottom-[15%] right-[10%] hidden items-end gap-[5px] opacity-10 sm:flex">
        {[35, 55, 80, 45, 70, 40, 60, 85, 50, 65, 48, 75, 38, 62].map((h, i) => (
          <div
            key={i}
            className="w-[5px] origin-bottom rounded-full animate-pulse"
            style={{
              height: `${h}px`,
              background: i % 3 === 0 ? "#FF2D78" : i % 3 === 1 ? "#00D4FF" : "#BFFF00",
              animationDuration: `${1.2 + (i % 5) * 0.4}s`,
              animationDelay: `${i * 0.08}s`,
            }}
          />
        ))}
      </div>

      {/* Ticket stub — top right */}
      <svg className="absolute -right-6 -top-6 size-[180px] opacity-[0.06] sm:size-[250px]" viewBox="0 0 280 320" fill="none">
        <rect x="40" y="10" width="230" height="300" rx="16" stroke="#FF2D78" strokeWidth="1" strokeDasharray="6 6" />
        <line x1="40" y1="70" x2="270" y2="70" stroke="#FF2D78" strokeWidth="0.5" strokeDasharray="4 4" />
        <circle cx="40" cy="70" r="12" fill="#08080a" stroke="#FF2D78" strokeWidth="0.5" />
        <circle cx="270" cy="70" r="12" fill="#08080a" stroke="#FF2D78" strokeWidth="0.5" />
      </svg>

      {/* Bottom fade to page background */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
