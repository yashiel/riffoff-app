"use client";

/**
 * Hero background — "The Stage"
 * Near-black with decorative grid lines (Soundstage-inspired)
 * and a continuous event ticker (Elkruff-inspired).
 */
export function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Solid dark base */}
      <div className="absolute inset-0 bg-[#0a0a0c]" />

      {/* Decorative grid lines — vertical rules at column positions */}
      <div className="absolute inset-0 hidden lg:block">
        {[16.667, 33.333, 50, 66.667, 83.333].map((pct) => (
          <div
            key={pct}
            className="absolute top-0 h-full w-px bg-white/[0.03]"
            style={{ left: `${pct}%` }}
          />
        ))}
      </div>

      {/* Single warm wash — barely perceptible */}
      <div className="absolute -left-[20%] top-[30%] h-[50%] w-[50%] rounded-full bg-[#FF2D78] opacity-[0.03] blur-[180px]" />

      {/* Bottom fade to page bg */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
