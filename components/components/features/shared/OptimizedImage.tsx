"use client";

import { useState } from "react";
import Image from "next/image";

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  fallback?: React.ReactNode;
  sizes?: string;
}

/**
 * Wrapper around Next.js Image with:
 * - Graceful fallback on error or missing src
 * - Blur placeholder for external images
 * - Proper sizes for responsive loading
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill,
  className,
  priority = false,
  fallback,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      fallback ?? (
        <div
          className={`flex items-center justify-center bg-[#2a2a2a] text-2xl opacity-15 ${className ?? ""}`}
          style={!fill ? { width, height } : undefined}
        >
          ♪
        </div>
      )
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      fill={fill}
      className={className}
      priority={priority}
      sizes={sizes}
      quality={80}
      onError={() => setHasError(true)}
      loading={priority ? "eager" : "lazy"}
    />
  );
}
