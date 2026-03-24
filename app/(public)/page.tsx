import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, Zap, Headphones, QrCode, BarChart3 } from "lucide-react";
import { EventScrollRow } from "@/components/features/events/EventScrollRow";
import { getUpcomingEvents } from "@/actions/events";
import { getExchangeRates, formatConvertedPrice } from "@/lib/currency";
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

  // Read currency preference and convert prices
  const cookieStore = await cookies();
  const displayCurrency = cookieStore.get("riffoff-currency")?.value || "original";
  let convertedPrices: Record<string, string> = {};

  if (displayCurrency !== "original" && upcomingEvents.length > 0) {
    try {
      const rates = await getExchangeRates("USD");
      if (rates) {
        for (const event of upcomingEvents) {
          if (event.minPrice && event.minPriceCurrency && event.minPriceCurrency !== displayCurrency) {
            const converted = formatConvertedPrice(event.minPrice, event.minPriceCurrency, displayCurrency, rates);
            if (converted) convertedPrices[event.$id] = converted;
          }
        }
      }
    } catch {
      // Currency conversion failed — show original prices
    }
  }

  return (
    <div className="flex flex-col">
      {/* Hero — video background with concert footage */}
      <section className="relative overflow-hidden py-24 sm:py-32 lg:py-40">
        {/* Video background */}
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/video/hero-poster.jpg"
            className="h-full w-full object-cover"
          >
            <source src="/video/hero-bg.webm" type="video/webm" />
          </video>
          {/* Dark overlay — ensures text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/50" />
          {/* Bottom fade into page background */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0e0e10] to-transparent" />
          {/* Lime tint overlay for brand identity */}
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(191,255,0,0.05)] via-transparent to-[rgba(124,58,237,0.08)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="font-display text-[clamp(3rem,8vw,6rem)] leading-[0.9]">
              Your next{" "}
              <span className="gradient-text">live show</span>
              {" "}starts here.
            </h1>

            <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-muted-foreground sm:text-[18px]">
              Discover events. Get tickets. No hidden fees, no scalping. Built
              for music lovers, artists, and organisers.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/events"
                className="btn-primary inline-flex items-center gap-2"
              >
                Browse Events
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/register" className="btn-ghost">
                Create Account
              </Link>
            </div>

            {/* Stats strip */}
            <div className="mt-12 flex gap-10">
              {[
                { value: "0%", label: "Hidden fees" },
                { value: "100%", label: "Fraud-proof" },
                { value: "3", label: "Payment methods" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-display text-[30px] text-coral">
                    {stat.value}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works — 3-step */}
      <section className="border-t border-[rgba(255,255,255,0.06)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-[36px]">How RiffOff works</h2>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Three steps to your next live experience
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                icon: Headphones,
                title: "Discover",
                desc: "Browse events by genre, date, or location. Find your scene.",
              },
              {
                step: "02",
                icon: Zap,
                title: "Get Tickets",
                desc: "Pay with card, PayPal, or TNG eWallet. Price shown = price paid.",
              },
              {
                step: "03",
                icon: QrCode,
                title: "Walk In",
                desc: "Show your QR e-ticket at the door. Instant scan, instant entry.",
              },
            ].map((item) => (
              <div key={item.step} className="relative rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                <span className="font-display text-[48px] text-coral/15">{item.step}</span>
                <div className="mt-2">
                  <item.icon className="size-5 text-coral" />
                  <h3 className="mt-3 font-display text-[18px]">{item.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
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
                <h2 className="font-display text-[36px]">
                  Trending Now
                </h2>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  Popular events coming up near you
                </p>
              </div>
              <Link
                href="/events"
                className="btn-ghost hidden !py-2 !text-[12px] sm:inline-flex"
              >
                View all
              </Link>
            </div>
            <div className="mt-8">
              <EventScrollRow events={serialize(upcomingEvents)} convertedPrices={convertedPrices} />
            </div>
          </div>
        </section>
      )}

      {/* CTA cards — For Organisers + For Artists */}
      <section className="border-t border-[rgba(255,255,255,0.06)] py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
          {[
            {
              icon: BarChart3,
              title: "For Organisers",
              desc: "Create events, manage ticket tiers, track sales, and scan tickets at the door — all from one dashboard.",
              cta: "Start organising",
              href: "/register",
            },
            {
              icon: Headphones,
              title: "For Artists",
              desc: "Apply to perform at events, share your profile, upload riders, and connect directly with organisers.",
              cta: "Join as artist",
              href: "/register",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="group rounded-xl border border-[rgba(255,255,255,0.06)] p-8 transition-all hover:border-coral/20 hover:bg-coral/[0.02]"
            >
              <card.icon className="size-6 text-coral" />
              <h3 className="mt-4 font-display text-[20px]">{card.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {card.desc}
              </p>
              <Link
                href={card.href}
                className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-coral transition-all group-hover:gap-2.5"
              >
                {card.cta}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
