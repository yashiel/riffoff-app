import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight, Zap, Headphones, QrCode, BarChart3, Shield,
  Sparkles, Music, Ticket, Globe, Users, Star,
} from "lucide-react";
import { HeroBackground } from "@/components/features/shared/HeroBackground";
import { EventScrollRow } from "@/components/features/events/EventScrollRow";
import { getUpcomingEvents } from "@/actions/events";
import { getExchangeRates, formatConvertedPrice } from "@/lib/currency";
import { serialize } from "@/lib/utils";
import type { EventWithVenue } from "@/actions/events";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let upcomingEvents: EventWithVenue[] = [];
  try { upcomingEvents = await getUpcomingEvents(); } catch {}

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
      {/* ═══════════════════════════════════════════
          HERO — Full viewport, cinematic
          ═══════════════════════════════════════════ */}
      <section className="relative flex min-h-[90svh] items-center overflow-hidden">
        <HeroBackground />

        <div className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.03] px-4 py-1.5 text-[12px] font-medium text-muted-foreground backdrop-blur-sm">
              <Sparkles className="size-3.5 text-coral" />
              The anti-scalping ticketing platform
            </div>

            <h1 className="mt-8 font-display text-[clamp(2.8rem,8vw,6.5rem)] leading-[0.88] tracking-tight">
              Your next{" "}
              <span className="bg-gradient-to-r from-[#FF2D78] via-[#FF6B35] to-[#00D4FF] bg-clip-text text-transparent">
                live show
              </span>
              <br />starts here.
            </h1>

            <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-muted-foreground sm:text-[18px]">
              Discover events. Get tickets. No hidden fees, no scalping.
              Built for music lovers, artists, and organisers.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/events" className="btn-primary group inline-flex items-center gap-2 !px-7 !py-3.5 !text-[14px]">
                Browse Events
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/register" className="btn-ghost !py-3.5">
                Create Account
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap gap-6">
              {[
                { value: "0%", label: "Hidden fees", icon: Shield },
                { value: "100%", label: "Fraud-proof", icon: Zap },
                { value: "3", label: "Payments", icon: Globe },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-foreground/[0.04]">
                    <stat.icon className="size-4 text-coral/70" />
                  </div>
                  <div>
                    <p className="font-display text-[22px] leading-none">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          TRENDING — Dark section with accent glow
          ═══════════════════════════════════════════ */}
      {upcomingEvents.length > 0 && (
        <section className="relative py-14 sm:py-20">
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[1px] w-[60%] bg-gradient-to-r from-transparent via-coral/30 to-transparent" />

          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-coral">
                  <Star className="size-3.5 fill-current" />
                  Trending Now
                </div>
                <h2 className="mt-2 font-display text-[clamp(1.6rem,3.5vw,2.5rem)] leading-none tracking-tight">
                  Don&apos;t miss out
                </h2>
              </div>
              <Link
                href="/events"
                className="hidden items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground transition-all hover:text-coral sm:inline-flex"
              >
                All events <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
          {/* Full-width carousel — breaks out of max-w container */}
          <div className="mt-8 pl-6 sm:pl-8 lg:pl-[calc((100vw-80rem)/2+3rem)]">
            <EventScrollRow events={serialize(upcomingEvents)} convertedPrices={convertedPrices} />
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          HOW IT WORKS — Colored card backgrounds
          ═══════════════════════════════════════════ */}
      <section className="relative py-14 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-card via-background to-background" />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="text-center">
            <div className="text-[12px] font-bold uppercase tracking-widest text-coral">
              Simple as 1-2-3
            </div>
            <h2 className="mt-3 font-display text-[clamp(1.8rem,4vw,3rem)] leading-none tracking-tight">
              How It Works
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5">
            {[
              {
                step: "01", icon: Headphones, title: "Discover",
                desc: "Browse by genre, date, or location. Filter what matters.",
                bg: "bg-gradient-to-br from-[#FF2D78]/10 to-[#FF2D78]/[0.02]",
                iconBg: "bg-[#FF2D78]/15", iconColor: "text-[#FF2D78]",
                borderColor: "border-[#FF2D78]/10 hover:border-[#FF2D78]/25",
              },
              {
                step: "02", icon: Ticket, title: "Get Tickets",
                desc: "Card, PayPal, or TNG eWallet. Price shown = price paid.",
                bg: "bg-gradient-to-br from-[#00D4FF]/10 to-[#00D4FF]/[0.02]",
                iconBg: "bg-[#00D4FF]/15", iconColor: "text-[#00D4FF]",
                borderColor: "border-[#00D4FF]/10 hover:border-[#00D4FF]/25",
              },
              {
                step: "03", icon: QrCode, title: "Walk In",
                desc: "QR e-ticket at the door. Instant scan, zero queues.",
                bg: "bg-gradient-to-br from-[#BFFF00]/10 to-[#BFFF00]/[0.02]",
                iconBg: "bg-[#BFFF00]/15", iconColor: "text-[#BFFF00]",
                borderColor: "border-[#BFFF00]/10 hover:border-[#BFFF00]/25",
              },
            ].map((item) => (
              <div key={item.step} className={`group relative overflow-hidden rounded-2xl border ${item.borderColor} ${item.bg} p-8 transition-all sm:p-10`}>
                <span className="font-display text-[72px] leading-none text-foreground/[0.03]">{item.step}</span>
                <div className="-mt-6">
                  <div className={`inline-flex size-12 items-center justify-center rounded-xl ${item.iconBg}`}>
                    <item.icon className={`size-5 ${item.iconColor}`} />
                  </div>
                  <h3 className="mt-5 font-display text-[22px]">{item.title}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CTA — Organisers + Artists
          ═══════════════════════════════════════════ */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="text-center">
            <div className="text-[12px] font-bold uppercase tracking-widest text-coral">Join the platform</div>
            <h2 className="mt-2 font-display text-[clamp(1.6rem,3.5vw,2.5rem)] leading-none tracking-tight">
              Built for Everyone
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5">
            {[
              {
                icon: BarChart3, title: "For Organisers",
                desc: "Create events, manage tiers, track sales, scan tickets — one dashboard.",
                cta: "Start organising", href: "/register",
                bg: "bg-gradient-to-br from-[#FF2D78]/8 to-transparent",
                border: "border-[#FF2D78]/10 hover:border-[#FF2D78]/25",
              },
              {
                icon: Music, title: "For Artists",
                desc: "Apply to perform, build your profile, upload riders, connect with organisers.",
                cta: "Join as artist", href: "/register",
                bg: "bg-gradient-to-br from-[#00D4FF]/8 to-transparent",
                border: "border-[#00D4FF]/10 hover:border-[#00D4FF]/25",
              },
            ].map((card) => (
              <div key={card.title} className={`group overflow-hidden rounded-2xl border ${card.border} ${card.bg} p-10 transition-all lg:p-12`}>
                <card.icon className="size-7 text-coral" />
                <h3 className="mt-6 font-display text-[26px]">{card.title}</h3>
                <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-muted-foreground">{card.desc}</p>
                <Link href={card.href} className="mt-8 inline-flex items-center gap-2 text-[14px] font-semibold text-coral transition-all group-hover:gap-3">
                  {card.cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          TRUST BAR
          ═══════════════════════════════════════════ */}
      <section className="border-t border-foreground/[0.05] py-14">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-6 text-muted-foreground sm:gap-10 sm:px-8 lg:justify-between lg:px-12">
          {[
            { icon: Shield, text: "Anti-scalping" },
            { icon: Zap, text: "QR check-in" },
            { icon: Globe, text: "Multi-currency" },
            { icon: Users, text: "40+ events" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2">
              <item.icon className="size-4 text-coral/50" />
              <span className="text-[12px] font-semibold uppercase tracking-wider">{item.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
