import Link from "next/link";
import { ArrowLeft, Shield, FileText, Scale } from "lucide-react";

interface LegalPageLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  icon: "privacy" | "terms";
  children: React.ReactNode;
}

const icons = {
  privacy: Shield,
  terms: Scale,
};

/**
 * Shared layout for legal pages (Privacy Policy, Terms & Conditions).
 * Professional typography, section numbering, and navigation.
 */
export function LegalPageLayout({
  title,
  subtitle,
  lastUpdated,
  icon,
  children,
}: LegalPageLayoutProps) {
  const Icon = icons[icon];

  return (
    <div className="relative min-h-screen">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-coral/5 via-transparent to-transparent">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-20">
          {/* Breadcrumb */}
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to RiffOff
          </Link>

          <div className="flex items-start gap-4 sm:gap-5">
            {/* Icon badge */}
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-coral/10 ring-1 ring-coral/20 sm:size-14">
              <Icon className="size-6 text-coral sm:size-7" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
                {subtitle}
              </p>
              <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                {title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <FileText className="size-3.5" />
                  Last updated: {lastUpdated}
                </span>
                <span className="text-border">•</span>
                <span>Effective immediately</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative gradient orb */}
        <div className="pointer-events-none absolute -right-32 -top-32 size-64 rounded-full bg-coral/5 blur-3xl" />
      </div>

      {/* Content area */}
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
          {/* Main content */}
          <article className="legal-content min-w-0">{children}</article>

          {/* Sticky sidebar — table of contents hint */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Quick links
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/privacy"
                  className="rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all hover:border-coral/30 hover:bg-card"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="size-3.5 text-coral" />
                    Privacy Policy
                  </span>
                </Link>
                <Link
                  href="/terms"
                  className="rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all hover:border-coral/30 hover:bg-card"
                >
                  <span className="flex items-center gap-2">
                    <Scale className="size-3.5 text-coral" />
                    Terms &amp; Conditions
                  </span>
                </Link>
              </div>

              <div className="mt-6 rounded-lg border border-border/50 bg-card/50 p-4">
                <p className="text-sm font-semibold">Questions?</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Contact our team for any legal inquiries.
                </p>
                <a
                  href="mailto:legal@riffoff.live"
                  className="mt-3 inline-flex items-center text-xs font-semibold text-coral transition-colors hover:text-coral/80"
                >
                  legal@riffoff.live →
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
