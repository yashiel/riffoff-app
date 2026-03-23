import Link from "next/link";
import { ArrowRight, Zap, Headphones, QrCode, BarChart3 } from "lucide-react";
import { EventScrollRow } from "@/components/features/events/EventScrollRow";
import { getUpcomingEvents } from "@/actions/events";
import { serialize } from "@/lib/utils";
import type { EventWithVenue } from "@/actions/events";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let upcomingEvents: EventWithVenue[] = [];
  try {
    upcomingEvents = await getUpcomingEvents();
  } catch {
    // Graceful degradation
  }

  return (
    <div className="flex flex-col">
      {/* Hero — bold left-aligned, DICE-inspired but uniquely RiffOff */}
      <section className="flex min-h-[85vh] flex-col justify-center px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <h1 className="font-display text-[clamp(3.5rem,12vw,9rem)] leading-[0.9] tracking-tight">
            Your next
            <br />
            <span className="text-coral">live show</span>
            <br />
            starts here.
          </h1>

          <p className="mt-8 max-w-md text-[16px] leading-relaxed text-muted-foreground">
            Discover events. Get tickets. No hidden fees, no scalping.
            Built for music lovers, artists, and organisers.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <Link href="/events" className="btn-primary inline-flex items-center gap-2">
              Browse Events
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/register" className="btn-ghost">
              Create Account
            </Link>
          </div>

          {/* Stats row — social proof */}
          <div className="mt-16 flex gap-10">
            {[
              { value: "0%", label: "Hidden fees" },
              { value: "100%", label: "Fraud-proof" },
              { value: "3", label: "Payment methods" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-[28px] text-coral">{stat.value}</p>
                <p className="text-[13px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Events — horizontal scroll (DICE pattern) */}
      {upcomingEvents.length > 0 && (
        <section className="border-t border-[rgba(255,255,255,0.06)] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="font-display text-[28px]">
                  Trending Now
                </h2>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  Popular events coming up near you
                </p>
              </div>
              <Link
                href="/events"
                className="btn-ghost hidden items-center gap-2 sm:inline-flex"
              >
                View all
              </Link>
            </div>
            <div className="mt-8">
              <EventScrollRow events={serialize(upcomingEvents)} />
            </div>
          </div>
        </section>
      )}

      {/* How it works — unique to RiffOff (not on DICE/Shotgun) */}
      <section className="border-t border-[rgba(255,255,255,0.06)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-[32px]">How RiffOff works</h2>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Three steps to your next live experience
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Discover",
                desc: "Browse events by genre, date, or location. Find your scene.",
                icon: Headphones,
              },
              {
                step: "02",
                title: "Get Tickets",
                desc: "Pay with card, PayPal, or TNG eWallet. Price shown = price paid.",
                icon: QrCode,
              },
              {
                step: "03",
                title: "Walk In",
                desc: "Show your QR e-ticket at the door. Instant scan, instant entry.",
                icon: Zap,
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <span className="font-display text-[48px] leading-none text-white/[0.04] sm:text-[64px]">
                  {item.step}
                </span>
                <div className="mt-[-20px]">
                  <item.icon className="size-6 text-coral" />
                  <h3 className="mt-3 text-[18px] font-bold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For organisers + artists CTA */}
      <section className="border-t border-[rgba(255,255,255,0.06)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Organisers */}
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-8">
              <BarChart3 className="size-7 text-coral" />
              <h3 className="mt-4 font-display text-[24px]">For Organisers</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                Create events, manage ticket tiers, track sales, and scan
                tickets at the door — all from one dashboard.
              </p>
              <Link
                href="/register"
                className="btn-ghost mt-6 inline-flex items-center gap-2"
              >
                Start organising
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {/* Artists */}
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-8">
              <Headphones className="size-7 text-coral" />
              <h3 className="mt-4 font-display text-[24px]">For Artists</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                Apply to perform at events, share your profile, upload riders,
                and connect directly with organisers.
              </p>
              <Link
                href="/register"
                className="btn-ghost mt-6 inline-flex items-center gap-2"
              >
                Join as artist
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
