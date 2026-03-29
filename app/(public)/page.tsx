import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight, Zap, Headphones, QrCode, BarChart3, Shield,
  Music, Ticket, Globe, Users, Star,
} from "lucide-react";
import { HeroBackground } from "@/components/features/shared/HeroBackground";
import { HeroTicker } from "@/components/features/shared/HeroTicker";
import { EventScrollRow } from "@/components/features/events/EventScrollRow";
import { TrendingArtists, type TrendingArtist } from "@/components/features/events/TrendingArtists";
import { getUpcomingEvents } from "@/actions/events";
import { getExchangeRates, formatConvertedPrice } from "@/lib/currency";
import { serialize } from "@/lib/utils";
import type { EventWithVenue } from "@/actions/events";

export const dynamic = "force-dynamic";

// Curated trending artists — derived from events data
// In production, this would come from an API/algorithm based on ticket sales + engagement
const TRENDING_ARTISTS: TrendingArtist[] = [
  { name: "BTS", genre: "K-Pop", imageUrl: "https://yashilanka.com/v1/storage/buckets/event-media/files/artist-bts/view?project=riffoff-dev", eventCount: 1, eventSlug: "evt-bts-sg" },
  { name: "ATEEZ", genre: "K-Pop", imageUrl: "https://yashilanka.com/v1/storage/buckets/event-media/files/artist-ateez/view?project=riffoff-dev", eventCount: 3, eventSlug: "evt-ateez-kl" },
  { name: "My Chemical Romance", genre: "Alt Rock", imageUrl: "https://yashilanka.com/v1/storage/buckets/event-media/files/artist-mcr/view?project=riffoff-dev", eventCount: 4, eventSlug: "evt-mcr-kl" },
  { name: "IVE", genre: "K-Pop", imageUrl: "https://yashilanka.com/v1/storage/buckets/event-media/files/artist-ive/view?project=riffoff-dev", eventCount: 2, eventSlug: "evt-ive-kl" },
  { name: "SEVENTEEN", genre: "K-Pop", imageUrl: "https://yashilanka.com/v1/storage/buckets/event-media/files/artist-seventeen/view?project=riffoff-dev", eventCount: 1, eventSlug: "evt-seventeen-sg" },
  { name: "TXT", genre: "K-Pop", imageUrl: "https://yashilanka.com/v1/storage/buckets/event-media/files/artist-txt/view?project=riffoff-dev", eventCount: 1, eventSlug: "evt-txt-kl" },
  { name: "DAY6", genre: "K-Rock", imageUrl: "https://yashilanka.com/v1/storage/buckets/event-media/files/artist-day6/view?project=riffoff-dev", eventCount: 1, eventSlug: "evt-day6-sg" },
  { name: "TREASURE", genre: "K-Pop", imageUrl: "https://yashilanka.com/v1/storage/buckets/event-media/files/artist-treasure/view?project=riffoff-dev", eventCount: 1, eventSlug: "evt-treasure-kl" },
  { name: "EXO", genre: "K-Pop", imageUrl: "https://yashilanka.com/v1/storage/buckets/event-media/files/artist-exo/view?project=riffoff-dev", eventCount: 1, eventSlug: "evt-exo-kl" },
  { name: "Yohani", genre: "Pop", imageUrl: "https://yashilanka.com/v1/storage/buckets/event-media/files/artist-yohani/view?project=riffoff-dev", eventCount: 1, eventSlug: "evt-yohani-live-colombo" },
  { name: "Bryan Adams", genre: "Rock", imageUrl: "https://yashilanka.com/v1/storage/buckets/event-media/files/artist-bryan/view?project=riffoff-dev", eventCount: 1, eventSlug: "evt-bryan-adams-kl" },
  { name: "Yuna", genre: "Indie Pop", imageUrl: "https://yashilanka.com/v1/storage/buckets/event-media/files/artist-yuna/view?project=riffoff-dev", eventCount: 1, eventSlug: "evt-yuna-homecoming" },
];

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
          HERO — "The Stage" — immersive typographic hero
          Inspired by: Soundstage (LA Phil), Elkruff, NOSPR
          ═══════════════════════════════════════════ */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <HeroBackground />

        {/* Featured event background image — fills hero, sits behind everything */}
        {upcomingEvents[0]?.coverimageUrl && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={upcomingEvents[0].coverimageUrl}
              alt=""
              className="h-full w-full object-cover opacity-[0.08]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-[#0a0a0c]/60" />
          </div>
        )}

        {/* Content — anchored to bottom of viewport (Elkruff pattern) */}
        <div className="relative flex min-h-[100svh] flex-col justify-end">

          {/* Main hero content */}
          <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12">

            {/* Oversized headline — Soundstage-inspired tight tracking */}
            <h1 className="font-display text-[clamp(4rem,12vw,10rem)] leading-[0.78] tracking-[-0.04em] text-white">
              Get in.
              <br />
              <span className="text-[#FF2D78]">Fair and square.</span>
            </h1>

            {/* Two-column: description left, featured event right */}
            <div className="mt-8 grid items-end gap-8 sm:mt-10 lg:grid-cols-2 lg:gap-16">
              {/* Left: Copy + CTAs */}
              <div className="pb-2">
                <p className="max-w-md text-lg leading-relaxed text-white/40">
                  The moments you&apos;ll never forget start with a ticket
                  you can actually trust. {upcomingEvents.length}+ shows across Southeast Asia.
                </p>

                <div className="mt-8 flex items-center gap-5">
                  <Link
                    href="/events"
                    className="group inline-flex items-center gap-2.5 bg-white px-7 py-4 text-base font-bold uppercase tracking-wider text-black transition-all hover:bg-[#FF2D78] hover:text-white"
                  >
                    Browse Events
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/register"
                    className="text-base font-medium text-white/40 underline decoration-white/10 underline-offset-4 transition-all hover:text-white/70 hover:decoration-white/30"
                  >
                    Create account
                  </Link>
                </div>
              </div>

              {/* Right: Featured event card — visible on lg+ */}
              {upcomingEvents[0] && (
                <Link href={`/events/${upcomingEvents[0].$id}`} className="group hidden lg:flex items-end gap-5">
                  {/* Thumbnail */}
                  <div className="relative size-28 shrink-0 overflow-hidden xl:size-32">
                    {upcomingEvents[0].coverimageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={upcomingEvents[0].coverimageUrl}
                        alt={upcomingEvents[0].title}
                        className="h-full w-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
                      />
                    ) : (
                      <div className="h-full w-full bg-white/5" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="pb-1">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#FF2D78]">
                      Featured
                    </p>
                    <p className="mt-1.5 font-display text-xl leading-tight text-white transition-colors group-hover:text-[#FF2D78]">
                      {upcomingEvents[0].title}
                    </p>
                    <p className="mt-1 text-base text-white/30">
                      {upcomingEvents[0].venue?.name ?? "Venue TBA"}
                    </p>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Trust line + Ticker — bottom strip */}
          <div className="relative mt-12 sm:mt-16">
            {/* Trust values */}
            <div className="mx-auto max-w-7xl px-6 pb-5 sm:px-8 lg:px-12">
              <div className="flex items-center gap-6">
                <p className="text-base text-white/25">
                  <span className="font-semibold text-white/50">Honest</span> pricing
                </p>
                <span className="text-white/10">·</span>
                <p className="text-base text-white/25">
                  <span className="font-semibold text-white/50">Instant</span> entry
                </p>
                <span className="text-white/10">·</span>
                <p className="text-base text-white/25">
                  <span className="font-semibold text-white/50">Real</span> fans only
                </p>
              </div>
            </div>

            {/* Continuous scrolling ticker */}
            <HeroTicker items={upcomingEvents.map((e) => e.title)} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          TRENDING — Dark section with accent glow
          ═══════════════════════════════════════════ */}
      {upcomingEvents.length > 0 && (
        <section className="relative py-10 sm:py-14">
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[1px] w-[60%] bg-gradient-to-r from-transparent via-coral/30 to-transparent" />

          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 text-base font-bold uppercase tracking-widest text-coral">
                  <Star className="size-3.5 fill-current" />
                  Trending Now
                </div>
                <h2 className="mt-2 font-display text-[clamp(1.6rem,3.5vw,2.5rem)] leading-none tracking-tight">
                  Don&apos;t miss out
                </h2>
              </div>
              <Link
                href="/events"
                className="hidden items-center gap-1.5 text-base font-semibold uppercase tracking-wider text-muted-foreground transition-all hover:text-coral sm:inline-flex"
              >
                All events <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
          {/* Full-width carousel — edge to edge */}
          <div className="mt-8">
            <EventScrollRow events={serialize(upcomingEvents)} convertedPrices={convertedPrices} />
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          TRENDING ARTISTS — Magazine-style staggered grid
          ═══════════════════════════════════════════ */}
      <section className="relative py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 text-base font-bold uppercase tracking-widest text-coral">
                <Music className="size-3.5" />
                Trending Artists
              </div>
              <h2 className="mt-2 font-display text-[clamp(1.6rem,3.5vw,2.5rem)] leading-none tracking-tight">
                Who&apos;s playing
              </h2>
            </div>
            <Link
              href="/events"
              className="hidden items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-coral sm:flex"
            >
              See all artists
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-6">
            <TrendingArtists artists={TRENDING_ARTISTS} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          HOW IT WORKS — Colored card backgrounds
          ═══════════════════════════════════════════ */}
      <section className="relative py-10 sm:py-14">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-card via-background to-background" />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="text-center">
            <div className="text-base font-bold uppercase tracking-widest text-coral">
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
                <span className="font-display text-[72px] leading-none text-muted-foreground/50">{item.step}</span>
                <div className="-mt-6">
                  <div className={`inline-flex size-12 items-center justify-center rounded-xl ${item.iconBg}`}>
                    <item.icon className={`size-5 ${item.iconColor}`} />
                  </div>
                  <h3 className="mt-5 font-display text-xl">{item.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CTA — Organisers + Artists
          ═══════════════════════════════════════════ */}
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="text-center">
            <div className="text-base font-bold uppercase tracking-widest text-coral">Join the platform</div>
            <h2 className="mt-2 font-display text-[clamp(1.6rem,3.5vw,2.5rem)] leading-none tracking-tight">
              Built for Everyone
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5">
            {[
              {
                icon: BarChart3, title: "For Organisers",
                desc: "Create events, manage tiers, track sales, scan tickets — one dashboard.",
                cta: "Start organising", href: "/register?role=organiser",
                bg: "bg-gradient-to-br from-[#FF2D78]/8 to-transparent",
                border: "border-[#FF2D78]/10 hover:border-[#FF2D78]/25",
              },
              {
                icon: Music, title: "For Artists",
                desc: "Apply to perform, build your profile, upload riders, connect with organisers.",
                cta: "Join as artist", href: "/register?role=artist",
                bg: "bg-gradient-to-br from-[#00D4FF]/8 to-transparent",
                border: "border-[#00D4FF]/10 hover:border-[#00D4FF]/25",
              },
            ].map((card) => (
              <div key={card.title} className={`group overflow-hidden rounded-2xl border ${card.border} ${card.bg} p-10 transition-all lg:p-12`}>
                <card.icon className="size-7 text-coral" />
                <h3 className="mt-6 font-display text-2xl">{card.title}</h3>
                <p className="mt-3 max-w-sm text-base leading-relaxed text-muted-foreground">{card.desc}</p>
                <Link href={card.href} className="mt-8 inline-flex items-center gap-2 text-base font-semibold text-coral transition-all group-hover:gap-3">
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
      <section className="border-t border-border py-14">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-6 text-muted-foreground sm:gap-10 sm:px-8 lg:justify-between lg:px-12">
          {[
            { icon: Shield, text: "Anti-scalping" },
            { icon: Zap, text: "QR check-in" },
            { icon: Globe, text: "Multi-currency" },
            { icon: Users, text: "40+ events" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2">
              <item.icon className="size-4 text-coral/50" />
              <span className="text-base font-semibold uppercase tracking-wider">{item.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
