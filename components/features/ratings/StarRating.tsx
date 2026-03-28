"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const;

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = React.useState(0);
  const isInteractive = !readonly && typeof onChange === "function";

  // Round to nearest 0.5 for display
  const displayValue = hoverValue || value;
  const rounded = Math.round(displayValue * 2) / 2;

  if (isInteractive) {
    return (
      <div
        role="radiogroup"
        aria-label="Rating"
        className="inline-flex gap-0.5"
        onMouseLeave={() => setHoverValue(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star !== 1 ? "s" : ""}`}
            className={cn(
              "cursor-pointer rounded-sm p-0.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              (hoverValue || value) >= star
                ? "text-yellow-400"
                : "text-muted-foreground/30",
            )}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverValue(star)}
          >
            <Star
              className={cn(SIZE_CLASSES[size], "fill-current")}
            />
          </button>
        ))}
      </div>
    );
  }

  // Read-only with half-star support via clip-path
  return (
    <div
      role="img"
      aria-label={`${value} out of 5 stars`}
      className="inline-flex gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = rounded >= star ? 1 : rounded >= star - 0.5 ? 0.5 : 0;

        return (
          <span key={star} className="relative inline-block">
            {/* Empty star (background) */}
            <Star
              className={cn(
                SIZE_CLASSES[size],
                "fill-current text-muted-foreground/30",
              )}
            />
            {/* Filled star (overlay) */}
            {fill > 0 && (
              <Star
                className={cn(
                  SIZE_CLASSES[size],
                  "absolute inset-0 fill-current text-yellow-400",
                )}
                style={
                  fill === 0.5
                    ? { clipPath: "inset(0 50% 0 0)" }
                    : undefined
                }
              />
            )}
          </span>
        );
      })}
    </div>
  );
}
