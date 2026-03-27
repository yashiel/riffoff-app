"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LogOut,
  Ticket,
  CalendarDays,
  Music,
  Settings,
  Shield,
  QrCode,
  ExternalLink,
} from "lucide-react";
import { logout } from "@/actions/auth";
import { NotificationBell } from "@/components/features/notifications/NotificationBell";
import { ThemeToggle } from "@/components/features/shared/ThemeToggle";
import { Logo } from "@/components/features/shared/Logo";

const ICON_MAP: Record<string, React.ElementType> = {
  "/dashboard/tickets": Ticket,
  "/dashboard/events": CalendarDays,
  "/dashboard/scanner": QrCode,
  "/dashboard/applications": Music,
  "/dashboard/settings": Settings,
  "/dashboard/admin": Shield,
};

interface NavItem {
  label: string;
  href: string;
}

interface MobileNavProps {
  navItems: NavItem[];
  displayName: string;
  initials: string;
  role: string;
}

export function MobileNav({
  navItems,
  displayName,
  initials,
  role,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeMenu = useCallback(() => setOpen(false), []);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      {/* ─── Header bar ─── */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-border bg-background/95 px-4 backdrop-blur-xl">
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <Link href="/" className="ml-2" aria-label="RiffOff home">
          <Logo height={22} className="text-foreground" />
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <NotificationBell />
        </div>
      </header>

      {/* ─── Overlay + slide-out menu ─── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* Menu panel — slides from LEFT to match desktop sidebar */}
          <nav
            className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col border-r border-border bg-background shadow-2xl animate-in slide-in-from-left duration-200"
            aria-label="Mobile navigation"
          >
            {/* User section */}
            <div className="border-b border-border p-5 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-coral/20 to-coral/5 text-base font-bold text-coral">
                    {initials}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-foreground">
                    {displayName}
                  </p>
                  <p className="truncate text-base capitalize text-muted-foreground">
                    {role}
                  </p>
                </div>
              </div>
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <div className="space-y-1">
                {navItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const Icon = ICON_MAP[item.href];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-all ${
                        isActive
                          ? "bg-coral/10 text-coral"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {Icon && (
                        <Icon
                          className={`size-5 ${isActive ? "text-coral" : "transition-colors group-hover:text-coral"}`}
                        />
                      )}
                      <span className="flex-1">{item.label}</span>
                      {isActive && (
                        <div className="size-1.5 rounded-full bg-coral" />
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Browse events */}
              <div className="mt-4 border-t border-border pt-4">
                <Link
                  href="/events"
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-coral/80 transition-colors hover:bg-coral/[0.06] hover:text-coral"
                >
                  <ExternalLink className="size-5" />
                  Browse Events
                </Link>
              </div>
            </div>

            {/* Sign out */}
            <div className="border-t border-border p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                  aria-label="Log out"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
