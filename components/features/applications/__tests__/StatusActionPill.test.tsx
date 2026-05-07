import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Star } from "lucide-react";
import { StatusActionPill } from "../StatusActionPill";

describe("StatusActionPill", () => {
  it("renders the label and icon", () => {
    render(
      <StatusActionPill
        label="Shortlist"
        Icon={Star}
        tone="amber"
        isCurrent={false}
        disabled={false}
        onClick={() => {}}
      />,
    );
    expect(screen.getByRole("button")).toHaveTextContent("Shortlist");
  });

  it("calls onClick when clicked and not current", () => {
    const onClick = vi.fn();
    render(
      <StatusActionPill
        label="Accept"
        Icon={Star}
        tone="emerald"
        isCurrent={false}
        disabled={false}
        onClick={onClick}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does NOT call onClick when isCurrent (button is disabled)", () => {
    const onClick = vi.fn();
    render(
      <StatusActionPill
        label="Accept"
        Icon={Star}
        tone="emerald"
        isCurrent={true}
        disabled={false}
        onClick={onClick}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does NOT call onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <StatusActionPill
        label="Reject"
        Icon={Star}
        tone="rose"
        isCurrent={false}
        disabled={true}
        onClick={onClick}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("marks aria-current when isCurrent is true", () => {
    render(
      <StatusActionPill
        label="Shortlist"
        Icon={Star}
        tone="amber"
        isCurrent={true}
        disabled={false}
        onClick={() => {}}
      />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("renders the optional currentSuffix when isCurrent", () => {
    render(
      <StatusActionPill
        label="Shortlist"
        Icon={Star}
        tone="amber"
        isCurrent={true}
        disabled={false}
        onClick={() => {}}
        currentSuffix="· Current"
      />,
    );
    expect(screen.getByRole("button")).toHaveTextContent("· Current");
  });

  it("does NOT render currentSuffix when isCurrent is false", () => {
    render(
      <StatusActionPill
        label="Shortlist"
        Icon={Star}
        tone="amber"
        isCurrent={false}
        disabled={false}
        onClick={() => {}}
        currentSuffix="· Current"
      />,
    );
    expect(screen.getByRole("button")).not.toHaveTextContent("· Current");
  });
});
