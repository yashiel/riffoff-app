"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Disc3 } from "lucide-react";

export interface TrendingArtist {
  name: string;
  genre: string;
  imageUrl: string;
  eventCount: number;
  eventSlug?: string;
}

interface TrendingArtistsProps {
  artists: TrendingArtist[];
}

/**
 * Trending Artists — magazine-style staggered grid with hover reveals.
 * First 3 artists get large hero cards, rest get compact tiles.
 */
export function TrendingArtists({ artists }: TrendingArtistsProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (artists.length === 0) return null;

  const featured = artists.slice(0, 3);
  const rest = artists.slice(3, 12);

  return (
    <div className="space-y-4">
      {/* Featured artists — 3-column hero cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {featured.map((artist, i) => (
          <Link
            key={artist.name}
            href={
              artist.eventSlug
                ? `/events/${artist.eventSlug}`
                : `/events?search=${encodeURIComponent(artist.name)}`
            }
            className="group relative overflow-hidden rounded-2xl"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Image */}
            <div className="relative aspect-[3/4] sm:aspect-[4/5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110"
              />

              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90" />

              {/* Colored accent line at top */}
              <div
                className="absolute left-0 right-0 top-0 h-1 transition-all duration-500 group-hover:h-1.5"
                style={{
                  background:
                    i === 0
                      ? "linear-gradient(90deg, #bfff00, #00ff88)"
                      : i === 1
                        ? "linear-gradient(90deg, #ff6b6b, #ffa500)"
                        : "linear-gradient(90deg, #6366f1, #a855f7)",
                }}
              />

              {/* Genre pill — top left */}
              <div className="absolute left-3 top-4">
                <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-white/70 backdrop-blur-sm">
                  {artist.genre}
                </span>
              </div>

              {/* Event count — top right */}
              <div className="absolute right-3 top-4">
                <span className="flex items-center gap-1 rounded-full bg-coral/90 px-2 py-0.5 text-xs font-bold text-black">
                  <Disc3
                    className={`size-3 ${hoveredIdx === i ? "animate-spin" : ""}`}
                    style={{ animationDuration: "3s" }}
                  />
                  {artist.eventCount} {artist.eventCount === 1 ? "show" : "shows"}
                </span>
              </div>

              {/* Bottom content */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                {/* Rank number */}
                <span className="text-[4rem] font-black leading-none tracking-tighter text-white/10 sm:text-[5rem]">
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Name */}
                <h3 className="-mt-4 text-xl font-extrabold leading-tight text-white sm:text-2xl">
                  {artist.name}
                </h3>

                {/* CTA — slides up on hover */}
                <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-coral opacity-0 transition-all duration-300 group-hover:opacity-100">
                  View events
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Rest of artists — compact horizontal tiles */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-9">
        {rest.map((artist, i) => (
          <Link
            key={artist.name}
            href={
              artist.eventSlug
                ? `/events/${artist.eventSlug}`
                : `/events?search=${encodeURIComponent(artist.name)}`
            }
            className="group relative overflow-hidden rounded-xl"
          >
            <div className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className="h-full w-full object-cover transition-all duration-500 group-hover:scale-110"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Event count dot */}
              <div className="absolute right-2 top-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-coral/90 text-[10px] font-bold text-black">
                  {artist.eventCount}
                </span>
              </div>

              {/* Name overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-xs font-bold leading-tight text-white">
                  {artist.name}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-white/50">
                  {artist.genre}
                </p>
              </div>

              {/* Hover glow border */}
              <div className="absolute inset-0 rounded-xl border border-transparent transition-all duration-300 group-hover:border-coral/30 group-hover:shadow-[inset_0_0_20px_rgba(191,255,0,0.05)]" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
