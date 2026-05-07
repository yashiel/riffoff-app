import { Music, Inbox, Star, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { getMyApplications } from "@/actions/artist-applications";
import { ArtistApplicationCard } from "@/components/features/applications/ArtistApplicationCard";

export const metadata = { title: "My Applications" };
export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  let applications: Awaited<ReturnType<typeof getMyApplications>> = [];
  try {
    applications = await getMyApplications();
  } catch {
    // Not authenticated
  }

  // Counts (status-bucketed)
  const counts = {
    total: applications.length,
    submitted: applications.filter((a) => a.status === "submitted").length,
    shortlisted: applications.filter((a) => a.status === "shortlisted").length,
    accepted: applications.filter((a) => a.status === "accepted").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
    withdrawn: applications.filter((a) => a.status === "withdrawn").length,
  };

  // Group for display
  const statusGroups = {
    active: applications.filter(
      (a) => a.status === "submitted" || a.status === "shortlisted",
    ),
    accepted: applications.filter((a) => a.status === "accepted"),
    closed: applications.filter(
      (a) => a.status === "rejected" || a.status === "withdrawn",
    ),
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Header */}
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
          My Applications
        </p>
        <h1 className="mt-1 font-display text-2xl leading-tight sm:text-[34px]">
          Performance applications
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Track every gig you&apos;ve applied to play in one place
        </p>
      </header>

      {/* Empty state */}
      {applications.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border/60 bg-card p-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-coral/10 text-coral ring-1 ring-coral/20">
            <Music className="size-5" aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-display text-xl">No applications yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse upcoming events and apply to perform — organisers will see
            your profile and message you back here.
          </p>
          <Link
            href="/events"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-coral px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-coral/90"
          >
            Browse Events
          </Link>
        </div>
      ) : (
        <>
          {/* Stat strip */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatTile
              label="Total"
              value={counts.total}
              Icon={Music}
              tone="neutral"
            />
            <StatTile
              label="Submitted"
              value={counts.submitted}
              Icon={Inbox}
              tone="blue"
            />
            <StatTile
              label="Shortlisted"
              value={counts.shortlisted}
              Icon={Star}
              tone="amber"
            />
            <StatTile
              label="Accepted"
              value={counts.accepted}
              Icon={CheckCircle2}
              tone="emerald"
            />
            <StatTile
              label="Closed"
              value={counts.rejected + counts.withdrawn}
              subtitle={
                counts.withdrawn > 0
                  ? `${counts.rejected} rejected · ${counts.withdrawn} withdrawn`
                  : undefined
              }
              Icon={XCircle}
              tone="muted"
            />
          </div>

          {/* Sections */}
          <div className="mt-8 space-y-8">
            {statusGroups.active.length > 0 && (
              <Section
                title="Active"
                description="Awaiting an organiser decision"
                count={statusGroups.active.length}
              >
                {statusGroups.active.map((app) => (
                  <ArtistApplicationCard key={app.$id} application={app} />
                ))}
              </Section>
            )}
            {statusGroups.accepted.length > 0 && (
              <Section
                title="Accepted"
                description="You're on the bill 🎉"
                count={statusGroups.accepted.length}
                tone="emerald"
              >
                {statusGroups.accepted.map((app) => (
                  <ArtistApplicationCard key={app.$id} application={app} />
                ))}
              </Section>
            )}
            {statusGroups.closed.length > 0 && (
              <Section
                title="Closed"
                description="Wrapped up — keep applying!"
                count={statusGroups.closed.length}
                tone="muted"
              >
                {statusGroups.closed.map((app) => (
                  <ArtistApplicationCard key={app.$id} application={app} />
                ))}
              </Section>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Stat Tile ────────────────────────────────────────

interface StatTileProps {
  label: string;
  value: number;
  subtitle?: string;
  Icon: typeof Music;
  tone: "neutral" | "blue" | "amber" | "emerald" | "muted";
}

const TILE_TONE: Record<StatTileProps["tone"], string> = {
  neutral: "text-foreground",
  blue: "text-blue-700 dark:text-blue-300",
  amber: "text-amber-700 dark:text-amber-300",
  emerald: "text-emerald-700 dark:text-emerald-300",
  muted: "text-muted-foreground",
};

function StatTile({ label, value, subtitle, Icon, tone }: StatTileProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className={`size-3.5 ${TILE_TONE[tone]}`} aria-hidden="true" />
      </div>
      <p className={`mt-1.5 font-display text-2xl ${TILE_TONE[tone]}`}>
        {value}
      </p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground/70">{subtitle}</p>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────

interface SectionProps {
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
  tone?: "default" | "emerald" | "muted";
}

function Section({
  title,
  description,
  count,
  children,
  tone = "default",
}: SectionProps) {
  const titleClass =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "muted"
        ? "text-muted-foreground"
        : "text-foreground";
  const countBg =
    tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : tone === "muted"
        ? "bg-muted text-muted-foreground"
        : "bg-coral/15 text-coral";
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className={`font-display text-2xl ${titleClass}`}>{title}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${countBg}`}
        >
          {count}
        </span>
        <p className="ml-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
