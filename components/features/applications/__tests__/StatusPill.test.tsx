import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill } from "../StatusPill";
import { STATUS_META } from "@/lib/applications/status-meta";
import type { ApplicationStatus } from "@/lib/appwrite/types";

const STATUSES: ApplicationStatus[] = [
  "submitted",
  "shortlisted",
  "accepted",
  "rejected",
  "withdrawn",
];

describe("StatusPill", () => {
  it("renders the default label for every status", () => {
    for (const s of STATUSES) {
      const { unmount } = render(<StatusPill status={s} />);
      expect(screen.getByText(STATUS_META[s].label)).toBeInTheDocument();
      unmount();
    }
  });

  it("accepts a custom label override", () => {
    render(<StatusPill status="accepted" label="On the bill" />);
    expect(screen.getByText("On the bill")).toBeInTheDocument();
    expect(screen.queryByText("Accepted")).not.toBeInTheDocument();
  });

  it("uses smaller padding for size='sm' (default)", () => {
    const { container } = render(<StatusPill status="submitted" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("text-xs");
    expect(span?.className).toContain("px-2.5");
  });

  it("uses larger padding for size='md'", () => {
    const { container } = render(<StatusPill status="submitted" size="md" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("text-sm");
    expect(span?.className).toContain("px-3");
  });
});
