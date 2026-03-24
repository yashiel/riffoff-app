import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight, Zap, Headphones, QrCode, BarChart3, Shield,
  Sparkles, Music, Ticket, Globe, Users,
} from "lucide-react";
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
    } catch {}
  }

  return (
    <div className="flex flex-col">
      {/* ═══ HERO — Full-screen immersive with video ═══ */}
      <section className="relative min-h-[100svh] flex items-center overflow-hidden">
        {/* Video background */}
        <div className="absolute inset-0">
          <video
            autoPlay muted loop playsInline
            poster="/video/hero-poster.jpg"
            className="h-full w-full object-cover"
          >
            <source src="/video/hero-bg.webm" type="video/webm" />
          </video>
          {/* Cinematic overlays */}
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(124,58,237,0.15)] via-transparent to-[rgba(191,255,0,0.08)]" />
          {/* Bottom fade to page */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-32 sm:px-8 lg:px-12">
          <div className="max-w-4xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[12px] font-medium text-white/70 backdrop-blur-sm">
              <Sparkles className="size-3.5 text-[#bfff00]" />
              The anti-scalping ticketing platform
            </div>

            {/* Headline — massive, dramatic */}
            <h1 className="mt-8 font-display text-[clamp(3.5rem,10vw,8rem)] leading-[0.85] tracking-tight text-white">
              Your next{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-[#bfff00] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">
                  live show
                </span>
              </span>
              <br />
              starts here.
            </h1>

            <p className="mt-8 max-w-lg text-[18px] leading-relaxed text-white/50 sm:text-[20px]">
              Discover events. Get tickets. No hidden fees, no scalping.
              Built for music lovers, artists, and organisers.
            </p>

            {/* CTA buttons */}
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/events"
                className="group inline-flex items-center gap-2.5 rounded-xl bg-[#bfff00] px-8 py-4 text-[15px] font-bold uppercase tracking-wide text-black transition-all hover:gap-3.5 hover:shadow-[0_0_40px_rgba(191,255,0,0.3)]"
              >
                Browse Events
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-8 py-4 text-[15px] font-medium text-white/80 backdrop-blur-sm transition-all hover:border-white/30 hover:text-white"
              >
                Create Account
              </Link>
            </div>

            {/* Stats — floating glass cards */}
            <div className="mt-16 flex flex-wrap gap-4">
              {[
                { value: "0%", label: "Hidden fees", icon: Shield },
                { value: "100%", label: "Fraud-proof", icon: Zap },
                { value: "3", label: "Payment methods", icon: Globe },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-md"
                >
                  <stat.icon className="size-4 text-[#bfff00]" />
                  <div>
                    <p className="font-display text-[22px] leading-none text-white">{stat.value}</p>
                    <p className="text-[11px] text-white/40">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute inset-x-0 bottom-8 flex justify-center">
          <div className="flex flex-col items-center gap-2 text-white/20">
            <span className="text-[10px] uppercase tracking-widest">Scroll</span>
            <div className="h-8 w-px bg-gradient-to-b from-white/20 to-transparent" />
          </div>
        </div>
      </section>

      {/* ═══ TRENDING EVENTS ═══ */}
      {upcomingEvents.length > 0 && (
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-[12px] font-semibold uppercase tracking-widest text-coral">
                  What&apos;s hot
                </span>
                <h2 className="mt-2 font-display text-[clamp(2rem,5vw,3.5rem)] leading-none tracking-tight">
                  Trending Now
                </h2>
              </div>
              <Link
                href="/events"
                className="hidden items-center gap-1.5 text-[13px] font-medium text-coral transition-all hover:gap-2.5 sm:inline-flex"
              >
                View all events
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="mt-10">
              <EventScrollRow events={serialize(upcomingEvents)} convertedPrices={convertedPrices} />
            </div>
          </div>
        </section>
      )}

      {/* ═══ HOW IT WORKS — 3-step with big numbers ═══ */}
      <section className="relative overflow-hidden border-y border-border py-24 sm:py-32">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-coral/[0.02] via-transparent to-[rgba(124,58,237,0.02)]" />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="text-center">
            <span className="text-[12px] font-semibold uppercase tracking-widest text-coral">
              Simple as 1-2-3
            </span>
            <h2 className="mt-2 font-display text-[clamp(2rem,5vw,3.5rem)] leading-none tracking-tight">
              How RiffOff Works
            </h2>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-3 sm:gap-8 lg:gap-12">
            {[
              {
                step: "01",
                icon: Headphones,
                title: "Discover",
                desc: "Browse events by genre, date, or location. Filter by what matters to you.",
                color: "from-violet-500/20 to-violet-500/5",
                iconColor: "text-violet-400",
              },
              {
                step: "02",
                icon: Ticket,
                title: "Get Tickets",
                desc: "Pay with card, PayPal, or TNG eWallet. The price shown is the price you pay.",
                color: "from-coral/20 to-coral/5",
                iconColor: "text-coral",
              },
              {
                step: "03",
                icon: QrCode,
                title: "Walk In",
                desc: "Show your QR e-ticket at the door. Instant scan, zero queues.",
                color: "from-cyan-500/20 to-cyan-500/5",
                iconColor: "text-cyan-400",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group relative overflow-hidden rounded-3xl border border-foreground/[0.06] p-8 transition-all hover:border-foreground/[0.12] sm:p-10"
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 transition-opacity group-hover:opacity-100`} />

                <div className="relative">
                  {/* Step number — watermark */}
                  <span className="font-display text-[80px] leading-none text-foreground/[0.04] sm:text-[100px]">
                    {item.step}
                  </span>

                  <div className="-mt-8 sm:-mt-10">
                    <div className={`inline-flex size-12 items-center justify-center rounded-2xl bg-foreground/[0.04] ${item.iconColor}`}>
                      <item.icon className="size-6" />
                    </div>
                    <h3 className="mt-5 font-display text-[24px]">{item.title}</h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA CARDS — Organisers + Artists ═══ */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="text-center">
            <span className="text-[12px] font-semibold uppercase tracking-widest text-coral">
              Join the platform
            </span>
            <h2 className="mt-2 font-display text-[clamp(2rem,5vw,3.5rem)] leading-none tracking-tight">
              Built for Everyone
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:gap-8">
            {[
              {
                icon: BarChart3,
                title: "For Organisers",
                desc: "Create events, manage ticket tiers, track sales in real-time, and scan tickets at the door — all from one dashboard.",
                cta: "Start organising",
                href: "/register",
                gradient: "from-coral/10 via-transparent to-transparent",
                borderHover: "hover:border-coral/30",
              },
              {
                icon: Music,
                title: "For Artists",
                desc: "Apply to perform at events, build your artist profile, upload riders, and connect directly with organisers.",
                cta: "Join as artist",
                href: "/register",
                gradient: "from-violet-500/10 via-transparent to-transparent",
                borderHover: "hover:border-violet-400/30",
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`group relative overflow-hidden rounded-3xl border border-foreground/[0.06] p-10 transition-all ${card.borderHover} lg:p-12`}
              >
                {/* Background gradient on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 transition-opacity group-hover:opacity-100`} />

                <div className="relative">
                  <card.icon className="size-8 text-coral" />
                  <h3 className="mt-6 font-display text-[28px]">{card.title}</h3>
                  <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
                    {card.desc}
                  </p>
                  <Link
                    href={card.href}
                    className="mt-8 inline-flex items-center gap-2 text-[15px] font-semibold text-coral transition-all group-hover:gap-3"
                  >
                    {card.cta}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST BAR ═══ */}
      <section className="border-t border-border py-16">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-6 sm:gap-12 sm:px-8 lg:justify-between lg:px-12">
          {[
            { icon: Shield, text: "Anti-scalping protection" },
            { icon: Zap, text: "Instant QR check-in" },
            { icon: Globe, text: "Multi-currency support" },
            { icon: Users, text: "40+ events across Asia" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2.5 text-muted-foreground">
              <item.icon className="size-4 text-coral/60" />
              <span className="text-[13px] font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
