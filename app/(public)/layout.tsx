import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { getLoggedInUser } from "@/lib/appwrite/server";
import { CurrencySelector } from "@/components/features/shared/CurrencySelector";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getLoggedInUser();
  const cookieStore = await cookies();
  const displayCurrency = cookieStore.get("riffoff-currency")?.value || "original";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation — clean, DICE/Shotgun-inspired */}
      <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.06)] bg-background/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="font-display text-[20px] tracking-wider"
          >
            <span className="text-coral">RIFF</span>OFF
          </Link>

          {/* Right nav */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/events"
              className="hidden text-[13px] font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-white sm:block"
            >
              Browse Events
            </Link>

            {user ? (
              <Link href="/dashboard" className="btn-primary !py-2 !px-4 !text-[12px]">
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-[13px] font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-white sm:block"
                >
                  Log in
                </Link>
                <Link href="/register" className="btn-ghost !py-1.5 !px-3 !text-[12px]">
                  Sign up
                </Link>
              </>
            )}

            {/* Currency picker — far right, after all nav items */}
            <div className="border-l border-white/[0.06] pl-3">
              <Suspense>
                <CurrencySelector currentCurrency={displayCurrency} />
              </Suspense>
            </div>
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer — minimal */}
      <footer className="border-t border-[rgba(255,255,255,0.06)] py-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-display text-[16px] tracking-wider">
            <span className="text-coral">RIFF</span>OFF
          </Link>
          <p className="text-[13px] text-muted-foreground">
            &copy; {new Date().getFullYear()} RiffOff
          </p>
        </div>
      </footer>
    </div>
  );
}
