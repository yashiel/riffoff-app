import Link from "next/link";
import { Users, CalendarDays, Ticket, QrCode, ScrollText, TrendingUp } from "lucide-react";
import { getPlatformStats } from "@/actions/admin";

export const metadata = { title: "Admin Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const stats = await getPlatformStats();

  if (!stats) {
    return (
      <div className="py-12 text-center">
        <p className="text-[14px] text-muted-foreground">Admin access required.</p>
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
      <h1 className="font-display text-[36px]">Admin Dashboard</h1>
      <p className="mt-2 text-[14px] text-muted-foreground">
        Platform overview and moderation tools
      </p>

      {/* Stats grid */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Card = (
            <div
              key={stat.label}
              className="rounded-xl border border-[var(--border)] p-5 transition-colors hover:border-[var(--border)]"
            >
              <stat.icon className="size-5 text-coral" />
              <p className="mt-3 font-display text-[32px]">{stat.value.toLocaleString()}</p>
              <p className="text-[13px] text-muted-foreground">{stat.label}</p>
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
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
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
              <p className="text-[14px] font-bold text-foreground">{link.label}</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{link.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
