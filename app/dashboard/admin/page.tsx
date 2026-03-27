import Link from "next/link";
import { Users, CalendarDays, Ticket, QrCode, ScrollText, TrendingUp } from "lucide-react";
import { getPlatformStats } from "@/actions/admin";

export const metadata = { title: "Admin Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const stats = await getPlatformStats();

  if (!stats) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <Users className="size-8 text-destructive" />
        </div>
        <h2 className="font-display text-xl">Access Denied</h2>
        <p className="max-w-sm text-base text-muted-foreground">
          You don&apos;t have admin privileges. Contact a platform administrator if you believe this is an error.
        </p>
        <Link
          href="/dashboard/tickets"
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, href: "/dashboard/admin/users" },
    { label: "Total Events", value: stats.totalEvents, icon: CalendarDays, href: "/dashboard/admin/events" },
    { label: "Published Events", value: stats.publishedEvents, icon: TrendingUp },
    { label: "Tickets Sold", value: stats.totalTickets, icon: Ticket },
    { label: "Checked In", value: stats.checkedIn, icon: QrCode },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl lg:text-[36px]">Admin Dashboard</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Platform overview and moderation tools
      </p>

      {/* Stats grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Card = (
            <div
              key={stat.label}
              className="rounded-xl border border-[var(--border)] p-3.5 transition-colors hover:border-[var(--border)] sm:p-5"
            >
              <stat.icon className="size-4 text-coral sm:size-5" />
              <p className="mt-2 truncate font-display text-xl sm:mt-3 sm:text-[32px]">{stat.value.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground sm:text-base">{stat.label}</p>
            </div>
          );

          return stat.href ? (
            <Link key={stat.label} href={stat.href}>{Card}</Link>
          ) : (
            <div key={stat.label}>{Card}</div>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Manage Users", description: "View, search, and change user roles", href: "/dashboard/admin/users", icon: Users },
          { label: "Moderate Events", description: "Review and cancel events", href: "/dashboard/admin/events", icon: CalendarDays },
          { label: "Audit Log", description: "View all platform actions", href: "/dashboard/admin/audit-log", icon: ScrollText },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-4 transition-all hover:border-coral/20 hover:bg-coral/5"
          >
            <link.icon className="mt-0.5 size-5 text-coral" />
            <div>
              <p className="text-base font-bold text-foreground">{link.label}</p>
              <p className="mt-0.5 text-base text-muted-foreground">{link.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
