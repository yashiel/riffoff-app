import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GuardianBadgeProps {
  size?: "sm" | "md";
}

export function GuardianBadge({ size = "md" }: GuardianBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex text-emerald-400" aria-label="Community Guardian">
            <ShieldCheck className={cn(size === "sm" ? "size-4" : "size-5")} />
          </span>
        </TooltipTrigger>
        <TooltipContent>Community Guardian</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
