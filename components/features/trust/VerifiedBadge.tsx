import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  size?: "sm" | "md";
}

export function VerifiedBadge({ size = "md" }: VerifiedBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex text-blue-400" aria-label="Verified Organiser">
            <BadgeCheck className={cn(size === "sm" ? "size-4" : "size-5")} />
          </span>
        </TooltipTrigger>
        <TooltipContent>Verified Organiser</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
