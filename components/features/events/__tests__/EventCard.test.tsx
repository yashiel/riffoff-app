import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventCard } from "../EventCard";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function mockDoc(overrides: Record<string, unknown> = {}) {
  return {
    $id: "evt-123",
    $createdAt: "2026-06-01T00:00:00.000Z",
    $updatedAt: "2026-06-01T00:00:00.000Z",
    $permissions: [],
    $databaseId: "riffoff",
    $collectionId: "events",
    $sequence: "",
    ...overrides,
  };
}

const mockEvent = mockDoc({
  organiserId: "org-1",
  venueId: "venue-1",
  title: "Summer Electronic Night",
  description: "An amazing event",
  genres: ["Electronic", "Techno"],
  startsAt: "2026-06-15T20:00:00.000Z",
  endsAt: "2026-06-16T02:00:00.000Z",
  status: "published",
  capacity: 500,
  coverimageUrl: null,
  isFree: false,
});

const mockVenue = mockDoc({
  $id: "venue-1",
  $collectionId: "venues",
  name: "Club Mercury",
  address: "123 Main St",
  geo: null,
});

describe("EventCard", () => {
  it("renders event title", () => {
    render(<EventCard event={{ ...mockEvent, venue: mockVenue } as never} />);
    expect(screen.getByText("Summer Electronic Night")).toBeInTheDocument();
  });

  it("renders venue name", () => {
    render(<EventCard event={{ ...mockEvent, venue: mockVenue } as never} />);
    expect(screen.getByText("Club Mercury")).toBeInTheDocument();
  });

  it("renders genre tags", () => {
    render(<EventCard event={{ ...mockEvent, venue: mockVenue } as never} />);
    expect(screen.getByText("Electronic")).toBeInTheDocument();
    expect(screen.getByText("Techno")).toBeInTheDocument();
  });

  it("links to event detail page", () => {
    render(<EventCard event={{ ...mockEvent, venue: mockVenue } as never} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/events/evt-123");
  });

  it("shows placeholder when no cover image", () => {
    render(<EventCard event={{ ...mockEvent, venue: mockVenue, coverimageUrl: null } as never} />);
    expect(screen.getByText("♪")).toBeInTheDocument();
  });

  it("renders without venue gracefully", () => {
    render(<EventCard event={{ ...mockEvent, venue: null } as never} />);
    expect(screen.getByText("Summer Electronic Night")).toBeInTheDocument();
  });
});
