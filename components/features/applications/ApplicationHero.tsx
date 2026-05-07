import Image from "next/image";
import { Calendar, MapPin, Music, Mail, ShieldCheck } from "lucide-react";
import { StarToggle } from "./StarToggle";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { ProfileDoc } from "@/lib/appwrite/types";

interface ApplicationHeroProps {
  applicationId: string;
  artistProfile: ProfileDoc | null;
  artistEmail: string | null;
  eventTitle: string;
  eventStartsAt: string;
  eventCoverUrl: string | null;
  venueName: string | null;
  submittedAt: string;
  /** Eyebrow text — defaults to "Review Application" (organiser view). */
  eyebrow?: string;
  /** Show the StarToggle. Defaults to true (organiser view). */
  showStar?: boolean;
}

/**
 * Cinematic hero section for the application review page.
 *
 * The event cover image renders as a blurred, darkened backdrop behind
 * the artist's identity card — visually anchors the page to "which event
 * is this for" while keeping the artist front and center.
 */
export function ApplicationHero({
  applicationId,
  artistProfile,
  artistEmail,
  eventTitle,
  eventStartsAt,
  eventCoverUrl,
  venueName,
  submittedAt,
  eyebrow = "Review Application",
  showStar = true,
}: ApplicationHeroProps) {
  const initials = (artistProfile?.displayName ?? "A").charAt(0).toUpperCase();

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card">
      {/* Backdrop image — heavily blurred + darkened */}
      {eventCoverUrl && (
        <div className="pointer-events-none absolute inset-0 -z-10">
          <Image
            src={eventCoverUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="scale-110 object-cover opacity-30 blur-2xl"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-card/40 via-card/70 to-card" />
        </div>
      )}

      <div className="relative p-6 sm:p-8 lg:p-10">
        {/* Top row: eyebrow + (optional) star toggle */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
            {eyebrow}
          </p>
          {showStar && <StarToggle applicationId={applicationId} />}
        </div>

        {/* Hero body */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-coral/40 via-coral/15 to-coral/5 text-4xl font-bold text-coral ring-1 ring-coral/30 sm:size-28 lg:size-32 lg:text-5xl">
            {initials}
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl leading-tight text-foreground sm:text-[34px] lg:text-[42px]">
              {artistProfile?.displayName ?? "Unknown Artist"}
              {artistProfile?.isVerified && (
                <ShieldCheck
                  className="ml-2 inline-block size-6 -translate-y-0.5 text-coral lg:size-7"
                  aria-label="Verified artist"
                />
              )}
            </h1>

            <p className="mt-1.5 text-base text-muted-foreground lg:text-lg">
              wants to perform at{" "}
              <span className="font-medium text-foreground">{eventTitle}</span>
            </p>

            {/* Genre pills */}
            {artistProfile?.artistGenres && artistProfile.artistGenres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {artistProfile.artistGenres.slice(0, 6).map((g) => (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1 rounded-full bg-coral/10 px-2.5 py-0.5 text-xs font-medium text-coral ring-1 ring-coral/20"
                  >
                    <Music className="size-2.5" aria-hidden="true" />
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Metadata row */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5 text-coral/70" aria-hidden="true" />
                {formatDate(eventStartsAt, { dateStyle: "medium" })}
              </span>
              {venueName && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {venueName}
                </span>
              )}
              {artistEmail && (
                <a
                  href={`mailto:${artistEmail}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-coral"
                >
                  <Mail className="size-3.5" aria-hidden="true" />
                  {artistEmail}
                </a>
              )}
              <span className="inline-flex items-center gap-1.5 text-muted-foreground/70">
                Submitted {formatRelativeTime(submittedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
