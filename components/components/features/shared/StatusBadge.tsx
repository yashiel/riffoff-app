import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusVariant = "default" | "success" | "warning" | "destructive" | "secondary" | "info";

const STATUS_VARIANTS: Record<string, StatusVariant> = {
  // Event
  draft: "secondary",
  published: "success",
  completed: "info",
  cancelled: "destructive",
  // Ticket
  active: "success",
  void: "destructive",
  refunded: "warning",
  // Order
  pending: "warning",
  paid: "success",
  failed: "destructive",
  disputed: "destructive",
  // Reservation
  held: "warning",
  converted: "success",
  expired: "secondary",
  // Application
  submitted: "default",
  shortlisted: "warning",
  accepted: "success",
  rejected: "destructive",
  withdrawn: "secondary",
  // RSVP
  going: "success",
  interested: "default",
  notgoing: "secondary",
  // Dispute
  open: "warning",
  needs_response: "destructive",
  won: "success",
  lost: "destructive",
  // User Roles
  attendee: "info",
  artist: "success",
  organiser: "warning",
  admin: "destructive",
};

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  default: "",
  success: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  destructive: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
  secondary: "bg-muted text-muted-foreground",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = STATUS_VARIANTS[status] ?? "default";

  return (
    <Badge
      variant="outline"
      className={cn(VARIANT_CLASSES[variant], "capitalize", className)}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
