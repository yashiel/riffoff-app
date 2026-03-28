"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Search,
  Ticket,
  Music,
  LayoutDashboard,
  Settings,
  LogOut,
  Globe,
  ChevronRight,
  Palette,
  Shield,
  Scale,
} from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { CurrencySelector } from "./CurrencySelector";

interface PublicMobileNavProps {
  user: { name: string; email: string } | null;
  currentCurrency: string;
}

export function PublicMobileNav({ user, currentCurrency }: PublicMobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href.split("?")[0]);

  return (
    <div className="sm:hidden">
      {/* Hamburger — only shows on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>

      {/* Backdrop */}
      <div
        className={`fixed top-0 left-0 right-0 bottom-0 z-[60] h-screen bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Full-screen slide-in drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 bottom-0 z-[70] flex h-screen w-full max-w-[340px] flex-col border-l border-border bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-[#08080a] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between px-5 py-4">
          <Logo height={20} className="text-foreground" />
          <button
            onClick={() => setOpen(false)}
            className="flex size-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ─── User card (logged in) ─── */}
        {user && (
          <div className="mx-4 mb-3 rounded-xl bg-card/80 p-4 ring-1 ring-border/50">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-coral/15 text-base font-bold text-coral">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Navigation ─── */}
        <nav className="flex-1 overflow-y-auto px-4 py-2">
          {/* Browse section */}
          <div className="space-y-0.5">
            <NavLink href="/events" icon={Search} label="Browse Events" active={isActive("/events")} />
            <NavLink href="/events?tab=live" icon={Music} label="Live Now" active={isActive("/events?tab=live")} badge="LIVE" />
            {user && (
              <NavLink href="/dashboard/tickets" icon={Ticket} label="My Tickets" active={isActive("/dashboard/tickets")} />
            )}
          </div>

          {/* Divider */}
          <div className="my-3 border-t border-border/50" />

          {/* Account section */}
          {user ? (
            <div className="space-y-0.5">
              <NavLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={isActive("/dashboard")} />
              <NavLink href="/dashboard/settings" icon={Settings} label="Settings" active={isActive("/dashboard/settings")} />
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-destructive transition-all hover:bg-destructive/10"
                >
                  <LogOut className="size-5 shrink-0" />
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                href="/login"
                className="flex w-full items-center justify-center rounded-xl border border-border px-4 py-3 text-base font-semibold transition-all hover:border-coral/30 hover:text-coral"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="flex w-full items-center justify-center rounded-xl bg-coral px-4 py-3 text-base font-bold text-black transition-all hover:bg-coral/90"
              >
                Create account
              </Link>
            </div>
          )}

          {/* Divider */}
          <div className="my-3 border-t border-border/50" />

          {/* Legal links */}
          <div className="space-y-0.5">
            <NavLink href="/privacy" icon={Shield} label="Privacy Policy" active={isActive("/privacy")} small />
            <NavLink href="/terms" icon={Scale} label="Terms & Conditions" active={isActive("/terms")} small />
          </div>
        </nav>

        {/* ─── Footer — Currency & Theme ─── */}
        <div className="border-t border-border/50 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-muted-foreground" />
              <CurrencySelector currentCurrency={currentCurrency} />
            </div>
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-muted-foreground" />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── NavLink helper ─── */
function NavLink({
  href,
  icon: Icon,
  label,
  active,
  badge,
  small,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  badge?: string;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-4 transition-all ${
        small ? "py-2.5" : "py-3"
      } ${
        active
          ? "bg-coral/10 text-coral"
          : "text-foreground hover:bg-muted"
      }`}
    >
      <Icon className={`shrink-0 ${small ? "size-4" : "size-5"}`} />
      <span className={`flex-1 font-medium ${small ? "text-sm" : "text-base"}`}>{label}</span>
      {badge && (
        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
          {badge}
        </span>
      )}
      <ChevronRight className={`text-muted-foreground/40 ${small ? "size-3.5" : "size-4"}`} />
    </Link>
  );
}
