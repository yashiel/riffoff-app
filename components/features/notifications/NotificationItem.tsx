"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Ticket,
  CalendarDays,
  XCircle,
  Music,
  CheckCircle2,
  Star,
  Bell,
  QrCode,
  AlertTriangle,
  Ban,
  Scale,
  PauseCircle,
  PlayCircle,
  ThumbsUp,
  Shield,
  BadgeCheck,
} from "lucide-react";
import { markAsRead } from "@/actions/notifications";
import type { NotificationDoc, NotificationType } from "@/lib/appwrite/types";

const ICON_MAP: Record<NotificationType, React.ElementType> = {
  ticket_purchased: Ticket,
  event_published: CalendarDays,
  event_cancelled: XCircle,
  application_submitted: Music,
  application_accepted: CheckCircle2,
  application_rejected: XCircle,
  application_shortlisted: Star,
  checkin_complete: QrCode,
  system: Bell,
  moderation_warning: AlertTriangle,
  moderation_ban: Ban,
  moderation_appeal_result: Scale,
  event_suspended: PauseCircle,
  event_reinstated: PlayCircle,
  rating_received: ThumbsUp,
  community_guardian_promoted: Shield,
  verified_badge_granted: BadgeCheck,
};

const COLOR_MAP: Record<NotificationType, string> = {
  ticket_purchased: "text-coral",
  event_published: "text-coral",
  event_cancelled: "text-red-400",
  application_submitted: "text-blue-400",
  application_accepted: "text-emerald-400",
  application_rejected: "text-red-400",
  application_shortlisted: "text-amber-400",
  checkin_complete: "text-emerald-400",
  system: "text-muted-foreground",
  moderation_warning: "text-amber-400",
  moderation_ban: "text-red-500",
  moderation_appeal_result: "text-blue-400",
  event_suspended: "text-red-400",
  event_reinstated: "text-emerald-400",
  rating_received: "text-amber-400",
  community_guardian_promoted: "text-purple-400",
  verified_badge_granted: "text-emerald-400",
};

interface NotificationItemProps {
  notification: NotificationDoc;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const [isPending, startTransition] = useTransition();
  const isUnread = !notification.readAt;
  const Icon = ICON_MAP[notification.type] ?? Bell;
  const iconColor = COLOR_MAP[notification.type] ?? "text-muted-foreground";

  const timeAgo = getTimeAgo(notification.$createdAt);

  function handleClick() {
    if (isUnread) {
      startTransition(async () => {
        await markAsRead(notification.$id);
      });
    }
  }

  const content = (
    <div
      className={`flex gap-3 rounded-xl p-3 transition-colors ${
        isUnread
          ? "bg-[var(--border)] hover:bg-[var(--border)]"
          : "opacity-60 hover:opacity-80"
      } ${isPending ? "opacity-50" : ""}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      {/* Icon */}
      <div className={`mt-0.5 shrink-0 ${iconColor}`}>
        <Icon className="size-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-base leading-tight ${isUnread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
            {notification.title}
          </p>
          {isUnread && (
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-coral" />
          )}
        </div>
        <p className="mt-0.5 text-base leading-relaxed text-muted-foreground line-clamp-2">
          {notification.body}
        </p>
        <p className="mt-1 text-sm text-muted-foreground/60">{timeAgo}</p>
      </div>
    </div>
  );

  if (notification.linkUrl) {
    return (
      <Link href={notification.linkUrl} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
