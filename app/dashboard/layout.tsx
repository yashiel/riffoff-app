import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLoggedInUser } from "@/lib/appwrite/server";
import { getProfileByUserId } from "@/actions/profiles";
import { logout } from "@/actions/auth";
import type { UserRole } from "@/lib/appwrite/types";
import { Ticket, CalendarDays, Music, User, Shield, QrCode, LogOut } from "lucide-react";

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
  { label: "Profile", href: "/dashboard/profile", icon: User },
  { label: "Admin", href: "/dashboard/admin", icon: Shield, roles: ["admin"] },
];

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getLoggedInUser();
  if (!user) redirect("/login");

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
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/5 bg-[oklch(0.08_0.015_270)] lg:flex">
        <div className="flex h-16 items-center px-6">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-tight"
          >
            <span className="gradient-text">Riff</span>Off
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-white/5 hover:text-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground capitalize">
                {role}
              </p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                aria-label="Log out"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b border-white/5 bg-background/80 px-4 backdrop-blur-xl lg:hidden">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-extrabold"
        >
          <span className="gradient-text">Riff</span>Off
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {visibleNav.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              aria-label={item.label}
            >
              <item.icon className="size-4" />
            </Link>
          ))}
        </div>
      </header>

      <main className="flex-1 pt-14 lg:pl-64 lg:pt-0">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
