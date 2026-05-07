import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StarToggle } from "../StarToggle";

const KEY = "riffoff:starred-applications";

describe("StarToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts unstarred when localStorage is empty", () => {
    render(<StarToggle applicationId="abc" />);
    expect(screen.getByRole("button", { name: /star this application/i }))
      .toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button")).toHaveTextContent("Star");
  });

  it("reads existing starred state from localStorage", () => {
    window.localStorage.setItem(KEY, JSON.stringify(["abc"]));
    render(<StarToggle applicationId="abc" />);
    const btn = screen.getByRole("button", { name: /remove star/i });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn).toHaveTextContent("Starred");
  });

  it("toggles state and persists to localStorage on click", () => {
    render(<StarToggle applicationId="abc" />);
    const btn = screen.getByRole("button");

    fireEvent.click(btn);
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? "[]")).toContain("abc");
    expect(btn).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(btn);
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? "[]")).not.toContain("abc");
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("preserves stars on other applications when toggling", () => {
    window.localStorage.setItem(KEY, JSON.stringify(["other-1", "other-2"]));
    render(<StarToggle applicationId="abc" />);
    fireEvent.click(screen.getByRole("button"));
    const stored = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    expect(stored).toContain("abc");
    expect(stored).toContain("other-1");
    expect(stored).toContain("other-2");
    expect(stored).toHaveLength(3);
  });
});
