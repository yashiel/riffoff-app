"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function getTrustScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function getTrustScoreLabel(score: number): string {
  if (score >= 80) return "Excellent trust score";
  if (score >= 60) return "Good trust score";
  if (score >= 40) return "Fair trust score";
  return "Low trust score";
}

interface TrustScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function TrustScoreBadge({
  score,
  showLabel = false,
  size = "md",
}: TrustScoreBadgeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const color = getTrustScoreColor(clamped);
  const label = getTrustScoreLabel(clamped);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-current/20 bg-current/10 px-2 py-0.5 font-medium tabular-nums",
              color,
              size === "sm" ? "text-xs" : "text-sm",
            )}
            aria-label={`Trust score: ${clamped} - ${label}`}
          >
            {clamped}
            {showLabel && (
              <span className="text-muted-foreground">trust</span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
