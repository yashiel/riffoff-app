import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { getLoggedInUser } from "@/lib/appwrite/server";
import { logout } from "@/actions/auth";
import { CurrencySelector } from "@/components/features/shared/CurrencySelector";
import { ThemeToggle } from "@/components/features/shared/ThemeToggle";
import { Logo } from "@/components/features/shared/Logo";
import { PublicMobileNav } from "@/components/features/shared/PublicMobileNav";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getLoggedInUser();
  const cookieStore = await cookies();
  const displayCurrency = cookieStore.get("riffoff-currency")?.value || "original";

  // Serializable user data for client component
  const mobileUser = user ? { name: user.name || "User", email: user.email } : null;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo — responsive */}
          <Link href="/" aria-label="RiffOff home">
            <Logo height={22} className="text-foreground sm:h-[26px]" />
          </Link>

          {/* Desktop nav — hidden on mobile */}
          <div className="hidden items-center gap-4 sm:flex">
            <Link
              href="/events"
              className="text-base font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
            >
              Browse Events
            </Link>

            {user ? (
              <>
                <Link href="/dashboard" className="btn-primary !py-2 !px-4 !text-base">
                  Dashboard
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    className="text-base font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-base font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                >
                  Log in
                </Link>
                <Link href="/register" className="btn-ghost !py-1.5 !px-3 !text-base">
                  Sign up
                </Link>
              </>
            )}

            {/* Theme toggle + Currency picker */}
            <div className="flex items-center gap-1 border-l border-border pl-3">
              <ThemeToggle />
              <Suspense>
                <CurrencySelector currentCurrency={displayCurrency} />
              </Suspense>
            </div>
          </div>

          {/* Mobile nav — login/signup visible + hamburger */}
          <div className="flex items-center gap-2 sm:hidden">
            {user ? (
              <>
                <Link href="/dashboard" className="btn-primary !py-1.5 !px-3 !text-sm">
                  Dashboard
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="bg-coral px-3 py-1.5 text-sm font-bold text-black transition-all hover:bg-coral/90"
                >
                  Sign up
                </Link>
              </>
            )}
            <PublicMobileNav user={mobileUser} currentCurrency={displayCurrency} />
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border py-8 sm:py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 sm:flex-row sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="RiffOff home">
            <Logo height={20} className="text-muted-foreground transition-colors hover:text-foreground sm:h-[22px]" />
          </Link>

          {/* Footer links — mobile: stacked center, desktop: inline */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/events" className="transition-colors hover:text-foreground">Events</Link>
            <Link href="/login" className="transition-colors hover:text-foreground">Log in</Link>
            <Link href="/register" className="transition-colors hover:text-foreground">Sign up</Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          </div>

          <p className="text-sm text-muted-foreground">
            &copy; 2026 RiffOff
          </p>
        </div>
      </footer>
    </div>
  );
}
