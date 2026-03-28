import { describe, it, expect } from "vitest";
import {
  computeTrustScore,
  meetsVerifiedCriteria,
  meetsGuardianCriteria,
  getTrustScoreColor,
  getTrustScoreLabel,
  type TrustScoreInput,
  type VerifiedCriteriaInput,
  type GuardianCriteriaInput,
} from "../trust-score";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Baseline input with all zeroes. */
function zeroInput(): TrustScoreInput {
  return {
    completedEvents: 0,
    totalNonDraftEvents: 0,
    averageRating: 0,
    totalRatings: 0,
    refundedOrders: 0,
    totalOrders: 0,
    accountAgeDays: 0,
    medianResponseTimeHours: 0,
    warningCount: 0,
    banCount: 0,
  };
}

/** Baseline input producing the highest possible score. */
function perfectInput(): TrustScoreInput {
  return {
    completedEvents: 100,
    totalNonDraftEvents: 100,
    averageRating: 5,
    totalRatings: 500,
    refundedOrders: 0,
    totalOrders: 1000,
    accountAgeDays: 730,
    medianResponseTimeHours: 1,
    warningCount: 0,
    banCount: 0,
  };
}

// ---------------------------------------------------------------------------
// computeTrustScore
// ---------------------------------------------------------------------------

describe("computeTrustScore", () => {
  it("perfect organiser — all max values produce score ~100", () => {
    const result = computeTrustScore(perfectInput());
    expect(result.total).toBe(100);
    expect(result.completionRate).toBe(30);
    expect(result.ratingScore).toBe(25);
    expect(result.refundScore).toBe(15);
    expect(result.accountAgeScore).toBe(10);
    expect(result.responseTimeScore).toBe(10);
    expect(result.moderationScore).toBe(10);
  });

  it("new organiser with no data — neutral defaults produce ~50", () => {
    const result = computeTrustScore(zeroInput());
    // No events → completionRate = 15 (neutral)
    expect(result.completionRate).toBe(15);
    // No ratings → ratingScore = 12.5
    expect(result.ratingScore).toBe(12.5);
    // No orders → refundScore = 15
    expect(result.refundScore).toBe(15);
    // 0 days → accountAgeScore = 0
    expect(result.accountAgeScore).toBe(0);
    // 0 hours response → 10 (< 24h tier)
    expect(result.responseTimeScore).toBe(10);
    // 0 warnings/bans → 10
    expect(result.moderationScore).toBe(10);
    // Total: 15 + 12.5 + 15 + 0 + 10 + 10 = 62.5 → 63
    expect(result.total).toBe(63);
  });

  it("terrible organiser — all events cancelled, low rating, high refunds, many warnings → near 0", () => {
    const result = computeTrustScore({
      completedEvents: 0,
      totalNonDraftEvents: 20,
      averageRating: 0.5,
      totalRatings: 100,
      refundedOrders: 100,
      totalOrders: 100,
      accountAgeDays: 5,
      medianResponseTimeHours: 500,
      warningCount: 10,
      banCount: 5,
    });
    expect(result.total).toBeLessThanOrEqual(5);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  // --- Completion rate weighting (0-30 pts) ---

  it("completion rate — 10/10 completed = 30 pts", () => {
    const input = { ...zeroInput(), completedEvents: 10, totalNonDraftEvents: 10, totalRatings: 0 };
    const result = computeTrustScore(input);
    expect(result.completionRate).toBe(30);
  });

  it("completion rate — 5/10 completed = 15 pts", () => {
    const input = { ...zeroInput(), completedEvents: 5, totalNonDraftEvents: 10, totalRatings: 0 };
    const result = computeTrustScore(input);
    expect(result.completionRate).toBe(15);
  });

  it("completion rate — 0/10 completed = 0 pts", () => {
    const input = { ...zeroInput(), completedEvents: 0, totalNonDraftEvents: 10, totalRatings: 0 };
    const result = computeTrustScore(input);
    expect(result.completionRate).toBe(0);
  });

  // --- Rating score weighting (0-25 pts) ---

  it("rating score — 5.0 average = 25 pts", () => {
    const input = { ...zeroInput(), averageRating: 5, totalRatings: 10 };
    const result = computeTrustScore(input);
    expect(result.ratingScore).toBe(25);
  });

  it("rating score — 2.5 average = 12.5 pts", () => {
    const input = { ...zeroInput(), averageRating: 2.5, totalRatings: 10 };
    const result = computeTrustScore(input);
    expect(result.ratingScore).toBe(12.5);
  });

  it("rating score — 0 average with ratings = 0 pts", () => {
    const input = { ...zeroInput(), averageRating: 0, totalRatings: 10 };
    const result = computeTrustScore(input);
    expect(result.ratingScore).toBe(0);
  });

  // --- Refund score (0-15 pts) ---

  it("refund score — 0% refund rate = 15 pts", () => {
    const input = { ...zeroInput(), refundedOrders: 0, totalOrders: 100 };
    const result = computeTrustScore(input);
    expect(result.refundScore).toBe(15);
  });

  it("refund score — 50% refund rate = 7.5 pts", () => {
    const input = { ...zeroInput(), refundedOrders: 50, totalOrders: 100 };
    const result = computeTrustScore(input);
    expect(result.refundScore).toBe(7.5);
  });

  it("refund score — 100% refund rate = 0 pts", () => {
    const input = { ...zeroInput(), refundedOrders: 100, totalOrders: 100 };
    const result = computeTrustScore(input);
    expect(result.refundScore).toBe(0);
  });

  // --- Account age (0-10 pts) ---

  it("account age — 0 days = 0 pts", () => {
    const input = { ...zeroInput(), accountAgeDays: 0 };
    const result = computeTrustScore(input);
    expect(result.accountAgeScore).toBe(0);
  });

  it("account age — 182 days ~ 4.99 pts", () => {
    const input = { ...zeroInput(), accountAgeDays: 182 };
    const result = computeTrustScore(input);
    // 182/365 * 10 ≈ 4.986... → rounded to 2 decimals = 4.99
    expect(result.accountAgeScore).toBeCloseTo(4.99, 1);
  });

  it("account age — 365+ days = 10 pts", () => {
    const input = { ...zeroInput(), accountAgeDays: 365 };
    const result = computeTrustScore(input);
    expect(result.accountAgeScore).toBe(10);
  });

  it("account age — 730 days still capped at 10 pts", () => {
    const input = { ...zeroInput(), accountAgeDays: 730 };
    const result = computeTrustScore(input);
    expect(result.accountAgeScore).toBe(10);
  });

  // --- Response time tiers (0-10 pts) ---

  it("response time — <24h = 10 pts", () => {
    const input = { ...zeroInput(), medianResponseTimeHours: 12 };
    const result = computeTrustScore(input);
    expect(result.responseTimeScore).toBe(10);
  });

  it("response time — <72h = 7 pts", () => {
    const input = { ...zeroInput(), medianResponseTimeHours: 48 };
    const result = computeTrustScore(input);
    expect(result.responseTimeScore).toBe(7);
  });

  it("response time — <168h = 4 pts", () => {
    const input = { ...zeroInput(), medianResponseTimeHours: 100 };
    const result = computeTrustScore(input);
    expect(result.responseTimeScore).toBe(4);
  });

  it("response time — 168h+ = 2 pts", () => {
    const input = { ...zeroInput(), medianResponseTimeHours: 200 };
    const result = computeTrustScore(input);
    expect(result.responseTimeScore).toBe(2);
  });

  // --- Moderation penalty (0-10 pts) ---

  it("moderation — 0 warnings, 0 bans = 10 pts", () => {
    const input = { ...zeroInput(), warningCount: 0, banCount: 0 };
    const result = computeTrustScore(input);
    expect(result.moderationScore).toBe(10);
  });

  it("moderation — 3 warnings = ~5.5 pts", () => {
    // (1 - 3*0.15 - 0*0.35) * 10 = (1 - 0.45) * 10 = 5.5
    const input = { ...zeroInput(), warningCount: 3, banCount: 0 };
    const result = computeTrustScore(input);
    expect(result.moderationScore).toBe(5.5);
  });

  it("moderation — warnings + bans lower score further", () => {
    // (1 - 2*0.15 - 1*0.35) * 10 = (1 - 0.30 - 0.35) * 10 = 3.5
    const input = { ...zeroInput(), warningCount: 2, banCount: 1 };
    const result = computeTrustScore(input);
    expect(result.moderationScore).toBe(3.5);
  });

  it("moderation — extreme penalties clamp to 0", () => {
    const input = { ...zeroInput(), warningCount: 10, banCount: 5 };
    const result = computeTrustScore(input);
    expect(result.moderationScore).toBe(0);
  });

  // --- Edge cases ---

  it("negative inputs are clamped — no negative scores", () => {
    const input: TrustScoreInput = {
      completedEvents: -5,
      totalNonDraftEvents: -10,
      averageRating: -2,
      totalRatings: -1,
      refundedOrders: -3,
      totalOrders: -7,
      accountAgeDays: -30,
      medianResponseTimeHours: -10,
      warningCount: -2,
      banCount: -1,
    };
    const result = computeTrustScore(input);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.completionRate).toBeGreaterThanOrEqual(0);
    expect(result.ratingScore).toBeGreaterThanOrEqual(0);
    expect(result.refundScore).toBeGreaterThanOrEqual(0);
    expect(result.accountAgeScore).toBeGreaterThanOrEqual(0);
    expect(result.responseTimeScore).toBeGreaterThanOrEqual(0);
    expect(result.moderationScore).toBeGreaterThanOrEqual(0);
  });

  it("score is always an integer between 0 and 100", () => {
    const cases: TrustScoreInput[] = [
      zeroInput(),
      perfectInput(),
      { ...zeroInput(), averageRating: 3.333, totalRatings: 7 },
      { ...perfectInput(), warningCount: 20, banCount: 10 },
    ];
    for (const input of cases) {
      const result = computeTrustScore(input);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.total)).toBe(true);
    }
  });

  it("division by zero safe — 0 events and 0 orders handled gracefully", () => {
    const input = { ...zeroInput(), totalNonDraftEvents: 0, totalOrders: 0 };
    const result = computeTrustScore(input);
    // Should not throw and should produce valid numbers
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.completionRate)).toBe(true);
    expect(Number.isFinite(result.refundScore)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// meetsVerifiedCriteria
// ---------------------------------------------------------------------------

describe("meetsVerifiedCriteria", () => {
  function passingInput(): VerifiedCriteriaInput {
    return {
      accountAgeDays: 180,
      completedEvents: 10,
      trustScore: 90,
      warningCount: 0,
      banLevel: "none",
    };
  }

  it("all criteria met — returns true", () => {
    expect(meetsVerifiedCriteria(passingInput())).toBe(true);
  });

  it("account too new (89 days) — returns false", () => {
    expect(meetsVerifiedCriteria({ ...passingInput(), accountAgeDays: 89 })).toBe(false);
  });

  it("not enough completed events (2) — returns false", () => {
    expect(meetsVerifiedCriteria({ ...passingInput(), completedEvents: 2 })).toBe(false);
  });

  it("trust score too low (74) — returns false", () => {
    expect(meetsVerifiedCriteria({ ...passingInput(), trustScore: 74 })).toBe(false);
  });

  it("has warnings — returns false", () => {
    expect(meetsVerifiedCriteria({ ...passingInput(), warningCount: 1 })).toBe(false);
  });

  it("has ban — returns false", () => {
    expect(meetsVerifiedCriteria({ ...passingInput(), banLevel: "temporary" })).toBe(false);
    expect(meetsVerifiedCriteria({ ...passingInput(), banLevel: "permanent" })).toBe(false);
  });

  it("boundary: exactly 90 days, 3 events, 75 score — returns true", () => {
    expect(
      meetsVerifiedCriteria({
        accountAgeDays: 90,
        completedEvents: 3,
        trustScore: 75,
        warningCount: 0,
        banLevel: "none",
      }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// meetsGuardianCriteria
// ---------------------------------------------------------------------------

describe("meetsGuardianCriteria", () => {
  function passingInput(): GuardianCriteriaInput {
    return {
      accountAgeDays: 365,
      totalEventsAttended: 50,
      actionedReports: 20,
      warningCount: 0,
    };
  }

  it("all criteria met — returns true", () => {
    expect(meetsGuardianCriteria(passingInput())).toBe(true);
  });

  it("account too new (179 days) — returns false", () => {
    expect(meetsGuardianCriteria({ ...passingInput(), accountAgeDays: 179 })).toBe(false);
  });

  it("not enough events attended (9) — returns false", () => {
    expect(meetsGuardianCriteria({ ...passingInput(), totalEventsAttended: 9 })).toBe(false);
  });

  it("not enough actioned reports (4) — returns false", () => {
    expect(meetsGuardianCriteria({ ...passingInput(), actionedReports: 4 })).toBe(false);
  });

  it("has warnings — returns false", () => {
    expect(meetsGuardianCriteria({ ...passingInput(), warningCount: 1 })).toBe(false);
  });

  it("boundary: exactly 180 days, 10 events, 5 reports — returns true", () => {
    expect(
      meetsGuardianCriteria({
        accountAgeDays: 180,
        totalEventsAttended: 10,
        actionedReports: 5,
        warningCount: 0,
      }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getTrustScoreColor
// ---------------------------------------------------------------------------

describe("getTrustScoreColor", () => {
  it("100 → green", () => expect(getTrustScoreColor(100)).toBe("green"));
  it("80 → green (boundary)", () => expect(getTrustScoreColor(80)).toBe("green"));
  it("79 → yellow", () => expect(getTrustScoreColor(79)).toBe("yellow"));
  it("60 → yellow (boundary)", () => expect(getTrustScoreColor(60)).toBe("yellow"));
  it("59 → orange", () => expect(getTrustScoreColor(59)).toBe("orange"));
  it("40 → orange (boundary)", () => expect(getTrustScoreColor(40)).toBe("orange"));
  it("39 → red", () => expect(getTrustScoreColor(39)).toBe("red"));
  it("0 → red", () => expect(getTrustScoreColor(0)).toBe("red"));
  it("negative → red (clamped)", () => expect(getTrustScoreColor(-10)).toBe("red"));
  it(">100 → green (clamped)", () => expect(getTrustScoreColor(150)).toBe("green"));
});

// ---------------------------------------------------------------------------
// getTrustScoreLabel
// ---------------------------------------------------------------------------

describe("getTrustScoreLabel", () => {
  it("100 → Excellent", () => expect(getTrustScoreLabel(100)).toBe("Excellent"));
  it("80 → Excellent (boundary)", () => expect(getTrustScoreLabel(80)).toBe("Excellent"));
  it("79 → Good", () => expect(getTrustScoreLabel(79)).toBe("Good"));
  it("60 → Good (boundary)", () => expect(getTrustScoreLabel(60)).toBe("Good"));
  it("59 → Fair", () => expect(getTrustScoreLabel(59)).toBe("Fair"));
  it("40 → Fair (boundary)", () => expect(getTrustScoreLabel(40)).toBe("Fair"));
  it("39 → Low", () => expect(getTrustScoreLabel(39)).toBe("Low"));
  it("0 → Low", () => expect(getTrustScoreLabel(0)).toBe("Low"));
  it("negative → Low (clamped)", () => expect(getTrustScoreLabel(-10)).toBe("Low"));
  it(">100 → Excellent (clamped)", () => expect(getTrustScoreLabel(150)).toBe("Excellent"));
});
