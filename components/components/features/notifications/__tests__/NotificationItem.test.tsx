import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationItem } from "../NotificationItem";
import type { NotificationDoc } from "@/lib/appwrite/types";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock the markAsRead action
vi.mock("@/actions/notifications", () => ({
  markAsRead: vi.fn().mockResolvedValue({}),
}));

const baseNotification: NotificationDoc = {
  $id: "notif-1",
  $createdAt: new Date().toISOString(),
  $updatedAt: new Date().toISOString(),
  $permissions: [],
  $databaseId: "riffoff",
  $collectionId: "notifications",
  $sequence: 0,
  userId: "user-123",
  type: "ticket_purchased",
  title: "Ticket confirmed!",
  body: 'Your ticket for "Summer Fest" is ready',
  linkUrl: "/dashboard/tickets/ticket-456",
  readAt: null,
  metadata: null,
};

describe("NotificationItem", () => {
  it("renders notification title", () => {
    render(<NotificationItem notification={baseNotification} />);
    expect(screen.getByText("Ticket confirmed!")).toBeInTheDocument();
  });

  it("renders notification body", () => {
    render(<NotificationItem notification={baseNotification} />);
    expect(screen.getByText(/Summer Fest/)).toBeInTheDocument();
  });

  it("shows unread indicator when readAt is null", () => {
    const { container } = render(<NotificationItem notification={baseNotification} />);
    // Unread dot (coral colored circle)
    const dot = container.querySelector(".bg-coral");
    expect(dot).toBeInTheDocument();
  });

  it("hides unread indicator when read", () => {
    const readNotif = { ...baseNotification, readAt: new Date().toISOString() };
    const { container } = render(<NotificationItem notification={readNotif} />);
    const dot = container.querySelector(".bg-coral");
    expect(dot).not.toBeInTheDocument();
  });

  it("renders as a link when linkUrl is provided", () => {
    render(<NotificationItem notification={baseNotification} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/dashboard/tickets/ticket-456");
  });

  it("renders without link when linkUrl is null", () => {
    const noLink = { ...baseNotification, linkUrl: null };
    render(<NotificationItem notification={noLink} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows time ago for recent notifications", () => {
    render(<NotificationItem notification={baseNotification} />);
    expect(screen.getByText("Just now")).toBeInTheDocument();
  });

  it("applies reduced opacity for read notifications", () => {
    const readNotif = { ...baseNotification, readAt: new Date().toISOString() };
    const { container } = render(<NotificationItem notification={readNotif} />);
    const item = container.querySelector(".opacity-60");
    expect(item).toBeInTheDocument();
  });
});
