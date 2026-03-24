import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLoggedInUser } from "@/lib/appwrite/server";
import { getProfileByUserId } from "@/actions/profiles";
import { logout } from "@/actions/auth";
import type { UserRole } from "@/lib/appwrite/types";
import { Ticket, CalendarDays, Music, Settings, Shield, QrCode, LogOut, ChevronRight } from "lucide-react";
import { NotificationBell } from "@/components/features/notifications/NotificationBell";
import { ThemeToggle } from "@/components/features/shared/ThemeToggle";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Tickets", href: "/dashboard/tickets", icon: Ticket },
  { label: "Events", href: "/dashboard/events", icon: CalendarDays, roles: ["organiser", "admin"] },
  { label: "Scanner", href: "/dashboard/scanner", icon: QrCode, roles: ["organiser", "admin"] },
  { label: "Applications", href: "/dashboard/applications", icon: Music, roles: ["artist", "admin"] },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Admin", href: "/dashboard/admin", icon: Shield, roles: ["admin"] },
];

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getLoggedInUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getProfileByUserId(user.$id);
  const role = profile?.role ?? "attendee";
  const displayName = user.name || profile?.displayName || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* ─── Sidebar — warm translucent glass ─── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col lg:flex">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-sidebar" />
        {/* Right edge glow line */}
        <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-coral/10 to-transparent" />

        <div className="relative flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center px-6">
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-tight"
            >
              <span className="gradient-text">Riff</span>
              <span className="text-white/90">Off</span>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5 px-3 py-4">
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-white/50 transition-all duration-200 hover:bg-white/[0.04] hover:text-white/90"
              >
                <item.icon className="size-[18px] transition-colors group-hover:text-coral" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="size-3 opacity-0 transition-all group-hover:opacity-40" />
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="p-3">
            <div className="rounded-xl bg-white/[0.03] p-3">
              <div className="flex items-center gap-3">
                {/* Avatar with coral ring */}
                <div className="relative shrink-0">
                  <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-coral/30 to-coral/10 text-[12px] font-bold text-coral ring-2 ring-coral/20">
                    {initials}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#0e0e12] bg-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-white/90">{displayName}</p>
                  <p className="truncate text-[11px] text-white/30 capitalize">{role}</p>
                </div>
                {/* Notification bell — inline with user info */}
                <ThemeToggle />
                <NotificationBell />
              </div>

              {/* Sign out — full-width subtle button below */}
              <div className="mt-2.5 border-t border-white/[0.04] pt-2.5">
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium text-white/25 transition-all hover:bg-white/[0.04] hover:text-white/50"
                    aria-label="Log out"
                  >
                    <LogOut className="size-3" />
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Mobile header ─── */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b border-border bg-background/90 px-4 backdrop-blur-xl lg:hidden">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-extrabold"
        >
          <span className="gradient-text">Riff</span>Off
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <NotificationBell />
          {visibleNav.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
              aria-label={item.label}
            >
              <item.icon className="size-4" />
            </Link>
          ))}
        </div>
      </header>

      {/* ─── Main content ─── */}
      <main className="flex-1 pt-14 lg:pl-[260px] lg:pt-0">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-12">
          {children}
        </div>
      </main>
    </div>
  );
}
