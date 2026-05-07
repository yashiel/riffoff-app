import {
  Inbox,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { ApplicationStatus } from "@/lib/appwrite/types";

/**
 * Single source of truth for application-status presentation.
 *
 * Every component that renders an application status (pill, card hero,
 * timeline, sidebar, list tile, CTA) should pull tone classes + labels
 * + icons from here so styling stays consistent across the app.
 *
 * All colour utilities use `text-X-700 dark:text-X-300` pairs so light
 * mode keeps proper contrast.
 */

type StatusToneKey = "blue" | "amber" | "emerald" | "rose" | "muted";

interface StatusMeta {
  /** Primary lucide icon for the status */
  Icon: LucideIcon;
  /** Short human-readable label (used in pills) */
  label: string;
  /** Slightly longer organiser-perspective label */
  organiserLabel: string;
  /** Slightly longer artist-perspective label */
  artistLabel: string;
  /** Tone family — drives all the tinted classes below */
  tone: StatusToneKey;
}

export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  submitted: {
    Icon: Inbox,
    label: "New",
    organiserLabel: "New application",
    artistLabel: "Submitted",
    tone: "blue",
  },
  shortlisted: {
    Icon: Star,
    label: "Shortlisted",
    organiserLabel: "On your shortlist",
    artistLabel: "Shortlisted",
    tone: "amber",
  },
  accepted: {
    Icon: CheckCircle2,
    label: "Accepted",
    organiserLabel: "Confirmed",
    artistLabel: "Accepted",
    tone: "emerald",
  },
  rejected: {
    Icon: XCircle,
    label: "Rejected",
    organiserLabel: "Not selected",
    artistLabel: "Not selected",
    tone: "rose",
  },
  withdrawn: {
    Icon: Clock,
    label: "Withdrawn",
    organiserLabel: "Withdrawn",
    artistLabel: "Withdrawn",
    tone: "muted",
  },
};

interface ToneClasses {
  /** Soft pill: `bg-X/10 text-X-700 dark:text-X-300 ring-X/30` */
  pill: string;
  /** Filled hero card backdrop: `from-X/15 via-X/5 to-transparent` */
  heroBg: string;
  /** Hero ring colour */
  heroRing: string;
  /** Headline tone for hero copy */
  heroHeadline: string;
  /** Icon tone */
  heroIcon: string;
  /** Solid status dot for avatars / list tiles */
  dot: string;
}

const TONE_CLASSES: Record<StatusToneKey, ToneClasses> = {
  blue: {
    pill: "bg-blue-500/10 text-blue-700 ring-blue-500/30 dark:text-blue-300",
    heroBg: "from-blue-500/15 via-blue-500/5 to-transparent",
    heroRing: "ring-blue-500/30",
    heroHeadline: "text-blue-700 dark:text-blue-200",
    heroIcon: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  amber: {
    pill: "bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-300",
    heroBg: "from-amber-500/20 via-amber-500/5 to-transparent",
    heroRing: "ring-amber-500/40",
    heroHeadline: "text-amber-700 dark:text-amber-200",
    heroIcon: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  emerald: {
    pill: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300",
    heroBg: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    heroRing: "ring-emerald-500/40",
    heroHeadline: "text-emerald-700 dark:text-emerald-200",
    heroIcon: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  rose: {
    pill: "bg-rose-500/10 text-rose-700 ring-rose-500/30 dark:text-rose-300",
    heroBg: "from-rose-500/15 via-rose-500/5 to-transparent",
    heroRing: "ring-rose-500/30",
    heroHeadline: "text-rose-700 dark:text-rose-200",
    heroIcon: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  muted: {
    pill: "bg-muted text-muted-foreground ring-border",
    heroBg: "from-muted via-muted/40 to-transparent",
    heroRing: "ring-border",
    heroHeadline: "text-foreground",
    heroIcon: "text-muted-foreground",
    dot: "bg-muted-foreground/40",
  },
};

export function toneClasses(status: ApplicationStatus): ToneClasses {
  return TONE_CLASSES[STATUS_META[status].tone];
}

/**
 * Allowed transitions for organiser-driven status changes.
 *
 * Organiser decisions are fully reversible. `withdrawn` is the artist's
 * own decision and is terminal: organisers cannot un-withdraw.
 */
export const ORGANISER_DECISIONS: ApplicationStatus[] = [
  "submitted",
  "shortlisted",
  "accepted",
  "rejected",
];

export function organiserCanChange(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  if (from === "withdrawn") return false;
  if (!ORGANISER_DECISIONS.includes(to)) return false;
  return true;
}

/**
 * Build a confirmation prompt for a destructive status reversal.
 * Returns `null` when the change is straightforward (no prompt needed).
 */
export function reversalConfirmMessage(
  from: ApplicationStatus,
  to: ApplicationStatus,
): string | null {
  if (from === to) return null;

  // Reset to the new-applications queue
  if (to === "submitted" && from !== "submitted") {
    return "Move back to the new-applications queue?";
  }

  // Shortlisting after a decision
  if (to === "shortlisted") {
    if (from === "accepted") return "Move this accepted artist back to the shortlist?";
    if (from === "rejected") return "Reconsider this rejected artist and shortlist them?";
  }

  // Accepting from rejection
  if (to === "accepted" && from === "rejected") {
    return "Reverse the rejection and accept this artist?";
  }

  // Rejecting from acceptance — most destructive
  if (to === "rejected") {
    if (from === "accepted") return "Withdraw the acceptance and reject this artist?";
    if (from === "shortlisted" || from === "submitted") return "Reject this application?";
  }

  return null;
}
