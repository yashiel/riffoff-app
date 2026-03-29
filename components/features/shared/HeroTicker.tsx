"use client";

interface HeroTickerProps {
  items: string[];
}

/**
 * Continuous horizontal scrolling ticker — Elkruff-inspired.
 * Duplicates items to create seamless infinite loop.
 */
export function HeroTicker({ items }: HeroTickerProps) {
  if (items.length === 0) return null;

  // Double the items for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden border-y border-white/[0.04] py-4">
      <div
        className="flex whitespace-nowrap"
        style={{
          animation: `ticker ${items.length * 4}s linear infinite`,
        }}
      >
        {doubled.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="mx-8 inline-flex items-center gap-4 font-display text-base uppercase tracking-[0.3em] text-white/[0.12] sm:text-lg"
          >
            <span className="size-1.5 rounded-full bg-[#FF2D78]/30" />
            {item}
          </span>
        ))}
      </div>

      {/* Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
}
