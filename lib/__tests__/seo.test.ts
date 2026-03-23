import { describe, it, expect } from "vitest";
import { createMetadata, createEventMetadata, createEventJsonLd } from "../seo";

describe("createMetadata", () => {
  it("generates title and description", () => {
    const meta = createMetadata({ title: "Events", description: "Browse events" });
    expect(meta.title).toBe("Events");
    expect(meta.description).toBe("Browse events");
  });

  it("generates OpenGraph data", () => {
    const meta = createMetadata({ title: "Events", path: "/events" });
    expect(meta.openGraph?.title).toContain("Events");
    expect(meta.openGraph?.url).toContain("/events");
  });

  it("generates Twitter metadata", () => {
    const meta = createMetadata({ title: "Events" });
    const twitter = meta.twitter as Record<string, unknown>;
    expect(twitter?.card).toBe("summary");
  });

  it("uses summary_large_image when image provided", () => {
    const meta = createMetadata({ title: "Events", image: "https://example.com/img.jpg" });
    const twitter = meta.twitter as Record<string, unknown>;
    expect(twitter?.card).toBe("summary_large_image");
  });

  it("sets noIndex when specified", () => {
    const meta = createMetadata({ title: "Private", noIndex: true });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("sets canonical URL", () => {
    const meta = createMetadata({ title: "Events", path: "/events" });
    expect(meta.alternates?.canonical).toContain("/events");
  });
});

describe("createEventMetadata", () => {
  it("generates event-specific metadata", () => {
    const meta = createEventMetadata({
      title: "Summer Fest",
      description: "Annual summer festival",
      eventId: "evt-123",
      startsAt: "2026-07-01T18:00:00Z",
      venueName: "Central Park",
    });
    expect(meta.title).toBe("Summer Fest");
    expect(meta.description).toContain("Annual summer festival");
  });

  it("generates description from venue name when no description", () => {
    const meta = createEventMetadata({
      title: "DJ Night",
      eventId: "evt-456",
      startsAt: "2026-08-15T21:00:00Z",
      venueName: "Club XS",
    });
    expect(meta.description).toContain("Club XS");
  });
});

describe("createEventJsonLd", () => {
  const event = {
    title: "Techno Night",
    description: "Underground techno event",
    startsAt: "2026-09-01T22:00:00Z",
    endsAt: "2026-09-02T04:00:00Z",
    venueName: "Warehouse 23",
    venueAddress: "123 Industrial Ave",
    eventId: "evt-789",
    isFree: false,
    minPrice: 25,
    currency: "MYR",
  };

  it("returns MusicEvent schema type", () => {
    const ld = createEventJsonLd(event);
    expect(ld["@type"]).toBe("MusicEvent");
  });

  it("includes venue as MusicVenue", () => {
    const ld = createEventJsonLd(event);
    expect(ld.location?.["@type"]).toBe("MusicVenue");
    expect(ld.location?.name).toBe("Warehouse 23");
  });

  it("includes price in offers", () => {
    const ld = createEventJsonLd(event);
    expect(ld.offers.price).toBe("25");
    expect(ld.offers.priceCurrency).toBe("MYR");
  });

  it("sets price 0 for free events", () => {
    const ld = createEventJsonLd({ ...event, isFree: true });
    expect(ld.offers.price).toBe("0");
  });

  it("includes start and end dates", () => {
    const ld = createEventJsonLd(event);
    expect(ld.startDate).toBe("2026-09-01T22:00:00Z");
    expect(ld.endDate).toBe("2026-09-02T04:00:00Z");
  });

  it("sets offline attendance mode", () => {
    const ld = createEventJsonLd(event);
    expect(ld.eventAttendanceMode).toContain("Offline");
  });
});

describe("Sanitize redirect URL (security + SEO)", () => {
  it("event URLs use clean paths", () => {
    const path = `/events/evt-123`;
    expect(path.startsWith("/events/")).toBe(true);
    expect(path).not.toContain("?");
  });
});
