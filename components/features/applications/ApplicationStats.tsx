import {
  Activity,
  Users,
  CalendarClock,
  Clock,
  Sparkles,
  Award,
} from "lucide-react";

interface Stat {
  label: string;
  value: string;
  hint?: string;
  Icon: typeof Activity;
  tone?: "neutral" | "good" | "warn";
}

interface ApplicationStatsProps {
  /** When the application was submitted */
  submittedAt: string;
  /** When the event publication was made */
  eventStartsAt: string;
  /** Total applications received for this event */
  totalApplicationsForEvent: number;
  /** Position of THIS application by submission order (1 = earliest) */
  submissionOrder: number;
  /** How many other applications this artist has at events from any organiser */
  artistTotalApplications: number;
  /** How many of this artist's previous applications were accepted */
  artistAcceptedCount: number;
  /** Trust score for this artist (0-100), or null */
  artistTrustScore: number | null;
}

/**
 * Computed stats sidebar — gives the organiser quick context they
 * couldn't easily get otherwise: where this application sits in the
 * queue, how prompt the artist was, their track record, etc.
 */
export function ApplicationStats({
  submittedAt,
  eventStartsAt,
  totalApplicationsForEvent,
  submissionOrder,
  artistTotalApplications,
  artistAcceptedCount,
  artistTrustScore,
}: ApplicationStatsProps) {
  const submissionDate = new Date(submittedAt);
  const eventDate = new Date(eventStartsAt);
  const daysBeforeEvent = Math.max(
    0,
    Math.round((eventDate.getTime() - submissionDate.getTime()) / 86400000),
  );

  const acceptanceRate =
    artistTotalApplications > 0
      ? Math.round((artistAcceptedCount / artistTotalApplications) * 100)
      : null;

  const stats: Stat[] = [
    {
      label: "Queue position",
      value: `${submissionOrder} of ${totalApplicationsForEvent}`,
      hint:
        submissionOrder === 1
          ? "First to apply"
          : submissionOrder <= 3
            ? "Early applicant"
            : undefined,
      Icon: Users,
      tone: submissionOrder <= 3 ? "good" : "neutral",
    },
    {
      label: "Lead time",
      value:
        daysBeforeEvent > 0 ? `${daysBeforeEvent} days before` : "Same-day apply",
      Icon: CalendarClock,
      tone: daysBeforeEvent < 7 ? "warn" : "good",
    },
    {
      label: "Past applications",
      value: `${artistTotalApplications}`,
      hint:
        artistTotalApplications === 1
          ? "First-time applicant"
          : `${artistAcceptedCount} accepted`,
      Icon: Activity,
      tone: artistTotalApplications > 5 ? "good" : "neutral",
    },
    ...(acceptanceRate !== null
      ? [
          {
            label: "Acceptance rate",
            value: `${acceptanceRate}%`,
            hint: `${artistAcceptedCount}/${artistTotalApplications} prior`,
            Icon: Sparkles,
            tone:
              acceptanceRate >= 50
                ? "good"
                : acceptanceRate >= 25
                  ? "neutral"
                  : "warn",
          } as Stat,
        ]
      : []),
    ...(artistTrustScore !== null
      ? [
          {
            label: "Trust score",
            value: `${artistTrustScore}/100`,
            Icon: Award,
            tone:
              artistTrustScore >= 70
                ? "good"
                : artistTrustScore >= 40
                  ? "neutral"
                  : "warn",
          } as Stat,
        ]
      : []),
  ];

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5">
      <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        <Clock className="size-3.5 text-coral" aria-hidden="true" />
        Application Stats
      </h2>
      <ul className="space-y-3">
        {stats.map((s) => {
          const Icon = s.Icon;
          const toneColor =
            s.tone === "good"
              ? "text-emerald-700 dark:text-emerald-300"
              : s.tone === "warn"
                ? "text-amber-700 dark:text-amber-300"
                : "text-foreground";
          return (
            <li key={s.label} className="flex items-start gap-2.5">
              <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  {s.label}
                </p>
                <p className={`text-base font-bold ${toneColor}`}>{s.value}</p>
                {s.hint && (
                  <p className="text-xs text-muted-foreground/60">{s.hint}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
