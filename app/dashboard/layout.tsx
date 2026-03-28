import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLoggedInUser } from "@/lib/appwrite/server";
import { getProfileByUserId } from "@/actions/profiles";
import { autoLiftExpiredBan } from "@/actions/warnings";
import { logout } from "@/actions/auth";
import type { UserRole } from "@/lib/appwrite/types";
import {
  Ticket,
  CalendarDays,
  Music,
  Settings,
  Shield,
  QrCode,
  LogOut,
  LayoutDashboard,
  ExternalLink,
  AlertTriangle,
  Flag,
  Scale,
} from "lucide-react";
import { NotificationBell } from "@/components/features/notifications/NotificationBell";
import { ThemeToggle } from "@/components/features/shared/ThemeToggle";
import { MobileNav } from "@/components/features/dashboard/MobileNav";
import { Logo } from "@/components/features/shared/Logo";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: UserRole[];
  section?: "main" | "manage" | "system";
}

const NAV_ITEMS: NavItem[] = [
  { label: "Tickets", href: "/dashboard/tickets", icon: Ticket, section: "main" },
  { label: "Events", href: "/dashboard/events", icon: CalendarDays, roles: ["organiser", "admin"], section: "main" },
  { label: "Scanner", href: "/dashboard/scanner", icon: QrCode, roles: ["organiser", "admin"], section: "main" },
  { label: "Applications", href: "/dashboard/applications", icon: Music, roles: ["artist", "organiser", "admin"], section: "main" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, section: "system" },
  { label: "Moderation", href: "/dashboard/admin/moderation", icon: Flag, roles: ["admin"], section: "system" },
  { label: "Appeals", href: "/dashboard/admin/appeals", icon: Scale, roles: ["admin"], section: "system" },
  { label: "Disputes", href: "/dashboard/admin/disputes", icon: AlertTriangle, roles: ["admin"], section: "system" },
  { label: "Admin", href: "/dashboard/admin", icon: Shield, roles: ["admin"], section: "system" },
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

  // Ban enforcement
  if (profile?.banLevel === "permanent_banned") {
    redirect("/suspended");
  }
  if (profile?.banLevel === "temp_banned") {
    if (profile.banExpiresAt && new Date(profile.banExpiresAt) > new Date()) {
      redirect("/suspended");
    } else {
      // Ban expired — auto-lift
      await autoLiftExpiredBan(profile);
    }
  }
  // Legacy deactivatedAt check as fallback
  if (profile?.deactivatedAt) {
    redirect("/suspended");
  }

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

  const mainNav = visibleNav.filter((i) => i.section === "main" || !i.section);
  const systemNav = visibleNav.filter((i) => i.section === "system");

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-background">
      {/* ─── Desktop Sidebar ─── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-border bg-sidebar lg:flex">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center px-5">
            <Link href="/" aria-label="RiffOff home">
              <Logo height={24} className="text-foreground" />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-2">
            {/* Main section */}
            <div className="space-y-0.5">
              {mainNav.map((item) => (
                <SidebarLink key={item.href} item={item} />
              ))}
            </div>

            {/* System section */}
            {systemNav.length > 0 && (
              <>
                <div className="my-4 h-px bg-border" />
                <div className="space-y-0.5">
                  {systemNav.map((item) => (
                    <SidebarLink key={item.href} item={item} />
                  ))}
                </div>
              </>
            )}
          </nav>

          {/* Browse events quick link */}
          <div className="px-3 pb-2">
            <Link
              href="/events"
              className="flex items-center gap-2 rounded-xl bg-coral/[0.06] px-3 py-2.5 text-base font-medium text-coral transition-colors hover:bg-coral/[0.12]"
            >
              <ExternalLink className="size-4" />
              Browse Events
            </Link>
          </div>

          {/* User section */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-3 rounded-xl p-2">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-coral/20 to-coral/5 text-base font-bold text-coral">
                  {initials}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-sidebar bg-emerald-400" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-foreground">
                  {displayName}
                </p>
                <p className="truncate text-sm capitalize text-muted-foreground">
                  {role}
                </p>
              </div>

              <ThemeToggle />
              <NotificationBell />
            </div>

            {/* Sign out */}
            <form action={logout} className="mt-1">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Log out"
              >
                <LogOut className="size-3.5" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ─── Mobile header + nav ─── */}
      <MobileNav
        navItems={visibleNav.map(({ label, href }) => ({ label, href }))}
        displayName={displayName}
        initials={initials}
        role={role}
      />

      {/* ─── Main content ─── */}
      <main className="min-w-0 flex-1 pt-14 lg:pl-[260px] lg:pt-0">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}

/* ─── Sidebar Link Component ─── */

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <Link
      href={item.href}
      className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-base font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
    >
      <item.icon className="size-[18px] shrink-0 transition-colors group-hover:text-coral" />
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}
