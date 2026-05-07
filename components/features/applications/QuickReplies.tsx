"use client";

import { Sparkles, MessageSquarePlus } from "lucide-react";

interface QuickRepliesProps {
  artistName: string;
  eventTitle: string;
}

interface Template {
  label: string;
  build: (artistName: string, eventTitle: string) => string;
}

/**
 * Click-to-insert message templates for the organiser. Dispatches a
 * window CustomEvent picked up by MessageInput, which pre-fills the
 * textarea so the organiser can edit before sending.
 */
const TEMPLATES: Template[] = [
  {
    label: "Confirm interest",
    build: (artist, event) =>
      `Hi ${artist}, thanks for applying to ${event}! We're reviewing applications this week and will be in touch soon.`,
  },
  {
    label: "Request demo",
    build: (artist) =>
      `Hi ${artist}, your application looks great. Could you share a 1-2 song demo (Spotify, SoundCloud, or YouTube link is fine) so we can hear your latest material?`,
  },
  {
    label: "Schedule call",
    build: (artist) =>
      `Hi ${artist}, we'd love to chat through your set list and stage requirements. What's your availability for a 15-minute call this week?`,
  },
  {
    label: "Send rider form",
    build: (artist) =>
      `Hi ${artist}, can you fill out our technical rider so we can confirm staging? I'll attach the form in my next message.`,
  },
  {
    label: "Welcome aboard",
    build: (artist, event) =>
      `Welcome to the ${event} lineup, ${artist}! We're really excited to have you. Soundcheck details and the green-room schedule will follow within 48 hours.`,
  },
  {
    label: "Polite decline",
    build: (artist, event) =>
      `Hi ${artist}, thank you for applying to ${event}. We received a lot of strong applications and aren't able to confirm you for this date — we'd love to keep you in mind for future events.`,
  },
];

export function QuickReplies({ artistName, eventTitle }: QuickRepliesProps) {
  function insert(template: Template) {
    const body = template.build(artistName, eventTitle);
    window.dispatchEvent(
      new CustomEvent<string>("riffoff:quick-reply", { detail: body }),
    );
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5">
      <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        <Sparkles className="size-3.5 text-coral" aria-hidden="true" />
        Quick Replies
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => insert(t)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/90 transition-all hover:border-coral/40 hover:bg-coral/5 hover:text-coral"
          >
            <MessageSquarePlus className="size-3" aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground/70">
        Click a template to load it into your reply — edit before sending.
      </p>
    </section>
  );
}
