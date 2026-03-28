import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { getLoggedInUser } from "@/lib/appwrite/server";
import { getMyNotifications, getUnreadCount } from "@/actions/notifications";
import { NotificationsPageClient } from "./NotificationsPageClient";

export const metadata = { title: "Notifications — RiffOff" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 20;

export default async function NotificationsPage({ searchParams }: Props) {
  const user = await getLoggedInUser();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [{ notifications, total }, unreadCount] = await Promise.all([
    getMyNotifications(PAGE_SIZE, false, offset),
    getUnreadCount(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (notifications.length === 0 && page === 1) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Your notification history
          </p>
        </div>

        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-full bg-muted p-4">
            <Bell className="size-8 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">
              You&apos;re all caught up!
            </p>
            <p className="mt-1 text-base text-muted-foreground">
              No notifications yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <NotificationsPageClient
      notifications={notifications}
      total={total}
      page={page}
      totalPages={totalPages}
      unreadCount={unreadCount}
    />
  );
}
