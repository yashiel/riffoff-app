"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Ticket,
  CalendarDays,
  XCircle,
  Music,
  CheckCircle2,
  Star,
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
import { markAsRead, markAllAsRead } from "@/actions/notifications";
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

interface Props {
  notifications: NotificationDoc[];
  total: number;
  page: number;
  totalPages: number;
  unreadCount: number;
}

export function NotificationsPageClient({
  notifications,
  total,
  page,
  totalPages,
  unreadCount,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllAsRead();
      router.refresh();
    });
  }

  function handleMarkRead(notificationId: string) {
    startTransition(async () => {
      await markAsRead(notificationId);
      router.refresh();
    });
  }

  // Group notifications by date
  const grouped = groupByDate(notifications);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-base text-muted-foreground">
            {total} {total === 1 ? "notification" : "notifications"}{" "}
            {unreadCount > 0 && (
              <span className="font-medium text-coral">
                ({unreadCount} unread)
              </span>
            )}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-card px-4 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <CheckCheck className="size-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification groups */}
      <div className="space-y-6">
        {grouped.map(({ label, items }) => (
          <section key={label}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </h2>
            <div className="space-y-1">
              {items.map((notification) => (
                <NotificationRow
                  key={notification.$id}
                  notification={notification}
                  isPending={isPending}
                  onMarkRead={handleMarkRead}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Notifications pagination"
          className="flex items-center justify-center gap-1"
        >
          <Link
            href={`/dashboard/notifications?page=${page - 1}`}
            aria-disabled={page <= 1}
            aria-label="Go to previous page"
            className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-base font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
              page <= 1 ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Previous</span>
          </Link>

          <span
            className="px-4 text-base text-muted-foreground"
            aria-current="page"
          >
            Page{" "}
            <span className="font-medium text-foreground">{page}</span> of{" "}
            <span className="font-medium text-foreground">{totalPages}</span>
          </span>

          <Link
            href={`/dashboard/notifications?page=${page + 1}`}
            aria-disabled={page >= totalPages}
            aria-label="Go to next page"
            className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-base font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
              page >= totalPages ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </nav>
      )}
    </div>
  );
}

// ─── Notification Row ────────────────────────────────

function NotificationRow({
  notification,
  isPending,
  onMarkRead,
}: {
  notification: NotificationDoc;
  isPending: boolean;
  onMarkRead: (id: string) => void;
}) {
  const isUnread = !notification.readAt;
  const Icon = ICON_MAP[notification.type] ?? Bell;
  const iconColor = COLOR_MAP[notification.type] ?? "text-muted-foreground";
  const timeAgo = getTimeAgo(notification.$createdAt);

  function handleClick() {
    if (isUnread) {
      onMarkRead(notification.$id);
    }
  }

  const content = (
    <div
      className={`flex gap-3 rounded-xl p-4 transition-colors ${
        isUnread
          ? "bg-card border border-border hover:bg-muted/50"
          : "opacity-60 hover:opacity-80"
      } ${isPending ? "opacity-50" : ""}`}
      onClick={handleClick}
      role={isUnread ? "button" : undefined}
      tabIndex={isUnread ? 0 : undefined}
      onKeyDown={(e) => isUnread && e.key === "Enter" && handleClick()}
    >
      {/* Icon */}
      <div
        className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted ${iconColor}`}
      >
        <Icon className="size-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-base leading-tight ${
              isUnread
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {notification.title}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm text-muted-foreground/60">{timeAgo}</span>
            {isUnread && (
              <span className="size-2 rounded-full bg-coral" />
            )}
          </div>
        </div>
        <p className="mt-1 text-base leading-relaxed text-muted-foreground">
          {notification.body}
        </p>
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

// ─── Helpers ─────────────────────────────────────────

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

interface DateGroup {
  label: string;
  items: NotificationDoc[];
}

function groupByDate(notifications: NotificationDoc[]): DateGroup[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  const today: NotificationDoc[] = [];
  const yesterday: NotificationDoc[] = [];
  const earlier: NotificationDoc[] = [];

  for (const n of notifications) {
    const ts = new Date(n.$createdAt).getTime();
    if (ts >= todayStart) {
      today.push(n);
    } else if (ts >= yesterdayStart) {
      yesterday.push(n);
    } else {
      earlier.push(n);
    }
  }

  const groups: DateGroup[] = [];
  if (today.length > 0) groups.push({ label: "Today", items: today });
  if (yesterday.length > 0) groups.push({ label: "Yesterday", items: yesterday });
  if (earlier.length > 0) groups.push({ label: "Earlier", items: earlier });

  return groups;
}
