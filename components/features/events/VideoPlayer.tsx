"use client";

import { useState } from "react";
import { Play, Volume2, Maximize2 } from "lucide-react";

interface VideoPlayerProps {
  url: string;
  title: string;
  posterUrl?: string;
}

/** Extract YouTube video ID from various URL formats */
function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // bare ID
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** Check if URL is a YouTube URL */
function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

export function VideoPlayer({ url, title, posterUrl }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const youtubeId = getYouTubeId(url);
  const isYoutube = isYouTubeUrl(url) || !!youtubeId;

  if (!url) return null;

  // YouTube embed
  if (isYoutube && youtubeId) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border">
        {!isPlaying ? (
          // Thumbnail with play button overlay
          <button
            onClick={() => setIsPlaying(true)}
            className="group relative aspect-video w-full cursor-pointer overflow-hidden bg-black"
            aria-label={`Play video: ${title}`}
          >
            {/* YouTube thumbnail */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterUrl || `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                // Fallback to hqdefault if maxresdefault doesn't exist
                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
              }}
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/20" />

            {/* Play button — centered */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-coral/90 text-white shadow-[0_0_40px_rgba(var(--coral-rgb,191,255,0),0.3)] transition-all group-hover:scale-110 group-hover:shadow-[0_0_60px_rgba(var(--coral-rgb,191,255,0),0.5)] dark:text-[#08080a] sm:size-20">
                <Play className="ml-1 size-7 fill-current sm:size-8" />
              </div>
            </div>

            {/* Bottom bar — video info */}
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent p-4">
              <Volume2 className="size-4 text-white/50" />
              <span className="text-base font-medium text-white/70">Watch promotional video</span>
              <Maximize2 className="ml-auto size-3.5 text-white/30" />
            </div>
          </button>
        ) : (
          // YouTube iframe
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&color=white`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        )}
      </div>
    );
  }

  // Generic video (MP4, WebM, etc.)
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <video
        src={url}
        poster={posterUrl}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full bg-black"
      >
        <track kind="captions" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
