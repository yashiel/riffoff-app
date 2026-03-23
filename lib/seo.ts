import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://riffoff.com";
const SITE_NAME = "RiffOff";
const DEFAULT_DESCRIPTION =
  "Discover music events, buy tickets, and connect with artists. The platform for small-to-mid scale music events.";

/** Generate metadata for a page */
export function createMetadata(options: {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
}): Metadata {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    path = "",
    image,
    type = "website",
    noIndex = false,
  } = options;

  const url = `${BASE_URL}${path}`;
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    ...(noIndex && { robots: { index: false, follow: false } }),
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      type,
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: title }] }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      ...(image && { images: [image] }),
    },
  };
}

/** Generate metadata for an event page (structured data ready) */
export function createEventMetadata(event: {
  title: string;
  description?: string;
  eventId: string;
  startsAt: string;
  venueName?: string;
  coverImageUrl?: string;
}): Metadata {
  const description = event.description
    ? event.description.slice(0, 160)
    : `Get tickets for ${event.title}${event.venueName ? ` at ${event.venueName}` : ""}`;

  return createMetadata({
    title: event.title,
    description,
    path: `/events/${event.eventId}`,
    image: event.coverImageUrl,
    type: "article",
  });
}

/** JSON-LD structured data for an event */
export function createEventJsonLd(event: {
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  venueName?: string;
  venueAddress?: string;
  coverImageUrl?: string;
  eventId: string;
  isFree: boolean;
  minPrice?: number;
  currency?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: event.title,
    description: event.description,
    startDate: event.startsAt,
    endDate: event.endsAt,
    url: `${BASE_URL}/events/${event.eventId}`,
    ...(event.coverImageUrl && { image: event.coverImageUrl }),
    ...(event.venueName && {
      location: {
        "@type": "MusicVenue",
        name: event.venueName,
        ...(event.venueAddress && {
          address: { "@type": "PostalAddress", streetAddress: event.venueAddress },
        }),
      },
    }),
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      url: `${BASE_URL}/events/${event.eventId}`,
      ...(event.isFree
        ? { price: "0", priceCurrency: event.currency ?? "MYR" }
        : event.minPrice !== undefined && {
            price: event.minPrice.toString(),
            priceCurrency: event.currency ?? "MYR",
          }),
    },
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  };
}
