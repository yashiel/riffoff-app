import { describe, it, expect } from "vitest";
import {
  STATUS_META,
  toneClasses,
  ORGANISER_DECISIONS,
  organiserCanChange,
  reversalConfirmMessage,
} from "../status-meta";
import type { ApplicationStatus } from "@/lib/appwrite/types";

const ALL_STATUSES: ApplicationStatus[] = [
  "submitted",
  "shortlisted",
  "accepted",
  "rejected",
  "withdrawn",
];

describe("STATUS_META", () => {
  it("has an entry for every ApplicationStatus", () => {
    for (const s of ALL_STATUSES) {
      expect(STATUS_META[s]).toBeDefined();
      expect(STATUS_META[s].label).toBeTypeOf("string");
      expect(STATUS_META[s].organiserLabel).toBeTypeOf("string");
      expect(STATUS_META[s].artistLabel).toBeTypeOf("string");
      expect(STATUS_META[s].Icon).toBeDefined();
      expect(["blue", "amber", "emerald", "rose", "muted"]).toContain(
        STATUS_META[s].tone,
      );
    }
  });

  it("uses distinct tones for the 4 organiser decisions", () => {
    const tones = ORGANISER_DECISIONS.map((s) => STATUS_META[s].tone);
    const unique = new Set(tones);
    expect(unique.size).toBe(4);
  });

  it("uses 'muted' tone for withdrawn (terminal artist decision)", () => {
    expect(STATUS_META.withdrawn.tone).toBe("muted");
  });
});

describe("toneClasses", () => {
  it("returns light-mode-safe classes for every status", () => {
    for (const s of ALL_STATUSES) {
      const tone = toneClasses(s);
      // Every tone must include both a light-mode (text-X-700)
      // and a dark-mode (dark:text-X-300) class for proper contrast,
      // EXCEPT 'muted' which uses neutral foreground tokens.
      if (STATUS_META[s].tone !== "muted") {
        expect(tone.pill).toMatch(/text-\w+-700/);
        expect(tone.pill).toMatch(/dark:text-\w+-300/);
      }
      // Hero gradient + ring + headline + dot are always present
      expect(tone.heroBg).toBeTypeOf("string");
      expect(tone.heroRing).toBeTypeOf("string");
      expect(tone.heroHeadline).toBeTypeOf("string");
      expect(tone.heroIcon).toBeTypeOf("string");
      expect(tone.dot).toBeTypeOf("string");
    }
  });
});

describe("organiserCanChange", () => {
  it("allows any organiser-decision to any other organiser-decision", () => {
    for (const from of ORGANISER_DECISIONS) {
      for (const to of ORGANISER_DECISIONS) {
        expect(organiserCanChange(from, to)).toBe(true);
      }
    }
  });

  it("forbids any change when the artist has withdrawn", () => {
    for (const to of ALL_STATUSES) {
      expect(organiserCanChange("withdrawn", to)).toBe(false);
    }
  });

  it("forbids transitioning anything to 'withdrawn' (artist-only)", () => {
    for (const from of ORGANISER_DECISIONS) {
      expect(organiserCanChange(from, "withdrawn")).toBe(false);
    }
  });
});

describe("reversalConfirmMessage", () => {
  it("returns null for same-status (no-op)", () => {
    for (const s of ALL_STATUSES) {
      expect(reversalConfirmMessage(s, s)).toBeNull();
    }
  });

  it("returns null for shortlisting from submitted (forward step)", () => {
    expect(reversalConfirmMessage("submitted", "shortlisted")).toBeNull();
  });

  it("warns when un-accepting", () => {
    expect(reversalConfirmMessage("accepted", "shortlisted")).toMatch(/back to the shortlist/);
    expect(reversalConfirmMessage("accepted", "rejected")).toMatch(/Withdraw the acceptance/);
  });

  it("warns when reversing a rejection", () => {
    expect(reversalConfirmMessage("rejected", "shortlisted")).toMatch(/Reconsider/);
    expect(reversalConfirmMessage("rejected", "accepted")).toMatch(/Reverse the rejection/);
  });

  it("warns on any reset to submitted", () => {
    for (const from of ORGANISER_DECISIONS.filter((s) => s !== "submitted")) {
      const msg = reversalConfirmMessage(from, "submitted");
      expect(msg).not.toBeNull();
      expect(msg).toMatch(/new-applications queue/);
    }
  });
});
