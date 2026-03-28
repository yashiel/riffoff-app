import { cn } from "@/lib/utils";
import { StarRating } from "@/components/features/ratings/StarRating";

interface RatingDisplayProps {
  averageRating: number;
  totalRatings: number;
  size?: "sm" | "md";
}

export function RatingDisplay({
  averageRating,
  totalRatings,
  size = "md",
}: RatingDisplayProps) {
  if (totalRatings === 0) {
    return (
      <span className={cn("text-muted-foreground", size === "sm" ? "text-xs" : "text-sm")}>
        No ratings yet
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        size === "sm" ? "text-xs" : "text-sm",
      )}
    >
      <span className="font-medium tabular-nums">{averageRating}</span>
      <StarRating value={averageRating} readonly size={size === "sm" ? "sm" : "md"} />
      <span className="text-muted-foreground">({totalRatings})</span>
    </span>
  );
}
