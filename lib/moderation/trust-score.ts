// lib/moderation/trust-score.ts
//
// Pure computation functions for organizer trust scores.
// NO "use server", NO database calls — receives pre-fetched data only.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw metrics fed into the trust-score algorithm. */
export interface TrustScoreInput {
  /** Number of events the organizer successfully completed. */
  completedEvents: number;
  /** Total non-draft events (published, completed, cancelled, etc.). */
  totalNonDraftEvents: number;
  /** Average attendee rating on a 0-5 scale. */
  averageRating: number;
  /** Total number of ratings received. */
  totalRatings: number;
  /** Number of orders that were refunded. */
  refundedOrders: number;
  /** Total orders placed across all events. */
  totalOrders: number;
  /** Days since the account was created. */
  accountAgeDays: number;
  /** Median time (hours) the organizer takes to respond to messages. */
  medianResponseTimeHours: number;
  /** Number of moderation warnings issued. */
  warningCount: number;
  /** Number of bans issued (temporary or permanent). */
  banCount: number;
}

/** Per-category breakdown of the computed trust score. */
export interface TrustScoreBreakdown {
  /** Overall score, 0-100 (integer). */
  total: number;
  /** Event completion rate component, 0-30. */
  completionRate: number;
  /** Attendee rating component, 0-25. */
  ratingScore: number;
  /** Refund history component, 0-15. */
  refundScore: number;
  /** Account age component, 0-10. */
  accountAgeScore: number;
  /** Response time component, 0-10. */
  responseTimeScore: number;
  /** Moderation history component, 0-10. */
  moderationScore: number;
}

/** Input for the "Verified Organizer" eligibility check. */
export interface VerifiedCriteriaInput {
  accountAgeDays: number;
  completedEvents: number;
  trustScore: number;
  warningCount: number;
  /** "none" | "temporary" | "permanent" */
  banLevel: "none" | "temporary" | "permanent";
}

/** Input for the "Community Guardian" eligibility check. */
export interface GuardianCriteriaInput {
  accountAgeDays: number;
  totalEventsAttended: number;
  actionedReports: number;
  warningCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a number between min and max (inclusive). */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Safely divide, returning `fallback` when the denominator is zero. */
function safeDivide(
  numerator: number,
  denominator: number,
  fallback: number,
): number {
  return denominator > 0 ? numerator / denominator : fallback;
}

// ---------------------------------------------------------------------------
// Core: computeTrustScore
// ---------------------------------------------------------------------------

/**
 * Compute a weighted trust score from pre-fetched organizer metrics.
 *
 * Weights:
 * - Completion rate:  30 pts (events completed / total non-draft)
 * - Rating score:     25 pts (average rating / 5)
 * - Refund score:     15 pts (1 - refunded / total orders)
 * - Account age:      10 pts (linear ramp, capped at 365 days)
 * - Response time:    10 pts (tiered: <24h=10, <72h=7, <168h=4, else 2)
 * - Moderation:       10 pts (penalised per warning & ban)
 *
 * @param input - Pre-fetched organizer metrics.
 * @returns Breakdown with per-category scores and a total (0-100, integer).
 */
export function computeTrustScore(input: TrustScoreInput): TrustScoreBreakdown {
  const completedEvents = clamp(input.completedEvents, 0, Infinity);
  const totalNonDraftEvents = clamp(input.totalNonDraftEvents, 0, Infinity);
  const averageRating = clamp(input.averageRating, 0, 5);
  const totalRatings = clamp(input.totalRatings, 0, Infinity);
  const refundedOrders = clamp(input.refundedOrders, 0, Infinity);
  const totalOrders = clamp(input.totalOrders, 0, Infinity);
  const accountAgeDays = clamp(input.accountAgeDays, 0, Infinity);
  const medianResponseTimeHours = clamp(
    input.medianResponseTimeHours,
    0,
    Infinity,
  );
  const warningCount = clamp(input.warningCount, 0, Infinity);
  const banCount = clamp(input.banCount, 0, Infinity);

  // 1. Completion rate (0-30) — neutral 15 when no events exist
  const completionRate =
    totalNonDraftEvents > 0
      ? clamp(safeDivide(completedEvents, totalNonDraftEvents, 0) * 30, 0, 30)
      : 15;

  // 2. Rating score (0-25) — neutral 12.5 when no ratings exist
  const ratingScore =
    totalRatings > 0 ? clamp((averageRating / 5) * 25, 0, 25) : 12.5;

  // 3. Refund score (0-15) — perfect 15 when no orders exist
  const refundScore =
    totalOrders > 0
      ? clamp((1 - safeDivide(refundedOrders, totalOrders, 0)) * 15, 0, 15)
      : 15;

  // 4. Account age (0-10) — linear ramp capped at 365 days
  const accountAgeScore = clamp(
    Math.min(accountAgeDays / 365, 1) * 10,
    0,
    10,
  );

  // 5. Response time (0-10) — tiered
  let responseTimeScore: number;
  if (medianResponseTimeHours < 24) {
    responseTimeScore = 10;
  } else if (medianResponseTimeHours < 72) {
    responseTimeScore = 7;
  } else if (medianResponseTimeHours < 168) {
    responseTimeScore = 4;
  } else {
    responseTimeScore = 2;
  }

  // 6. Moderation (0-10) — each warning costs 15%, each ban costs 35%
  const moderationScore = clamp(
    (1 - warningCount * 0.15 - banCount * 0.35) * 10,
    0,
    10,
  );

  // Total: sum of all categories, clamped 0-100, rounded to integer
  const rawTotal =
    completionRate +
    ratingScore +
    refundScore +
    accountAgeScore +
    responseTimeScore +
    moderationScore;

  const total = Math.round(clamp(rawTotal, 0, 100));

  return {
    total,
    completionRate: Math.round(completionRate * 100) / 100,
    ratingScore: Math.round(ratingScore * 100) / 100,
    refundScore: Math.round(refundScore * 100) / 100,
    accountAgeScore: Math.round(accountAgeScore * 100) / 100,
    responseTimeScore,
    moderationScore: Math.round(moderationScore * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Eligibility: meetsVerifiedCriteria
// ---------------------------------------------------------------------------

/**
 * Check whether an organizer meets all criteria for the "Verified" badge.
 *
 * All conditions must be true:
 * - Account age >= 90 days
 * - Completed events >= 3
 * - Trust score >= 75
 * - Zero moderation warnings
 * - No active ban (banLevel === "none")
 *
 * @param input - Eligibility metrics.
 * @returns `true` if every criterion is satisfied.
 */
export function meetsVerifiedCriteria(input: VerifiedCriteriaInput): boolean {
  return (
    input.accountAgeDays >= 90 &&
    input.completedEvents >= 3 &&
    input.trustScore >= 75 &&
    input.warningCount === 0 &&
    input.banLevel === "none"
  );
}

// ---------------------------------------------------------------------------
// Eligibility: meetsGuardianCriteria
// ---------------------------------------------------------------------------

/**
 * Check whether a user meets all criteria for the "Community Guardian" role.
 *
 * All conditions must be true:
 * - Account age >= 180 days
 * - Total events attended >= 10
 * - Actioned reports >= 5
 * - Zero moderation warnings
 *
 * @param input - Guardian eligibility metrics.
 * @returns `true` if every criterion is satisfied.
 */
export function meetsGuardianCriteria(input: GuardianCriteriaInput): boolean {
  return (
    input.accountAgeDays >= 180 &&
    input.totalEventsAttended >= 10 &&
    input.actionedReports >= 5 &&
    input.warningCount === 0
  );
}

// ---------------------------------------------------------------------------
// Display: getTrustScoreColor
// ---------------------------------------------------------------------------

/**
 * Map a trust score (0-100) to a semantic colour string.
 *
 * | Range   | Colour   |
 * |---------|----------|
 * | 80-100  | "green"  |
 * | 60-79   | "yellow" |
 * | 40-59   | "orange" |
 * | 0-39    | "red"    |
 *
 * @param score - Trust score (0-100).
 * @returns Colour string.
 */
export function getTrustScoreColor(score: number): string {
  const clamped = clamp(score, 0, 100);
  if (clamped >= 80) return "green";
  if (clamped >= 60) return "yellow";
  if (clamped >= 40) return "orange";
  return "red";
}

// ---------------------------------------------------------------------------
// Display: getTrustScoreLabel
// ---------------------------------------------------------------------------

/**
 * Map a trust score (0-100) to a human-readable label.
 *
 * | Range   | Label       |
 * |---------|-------------|
 * | 80-100  | "Excellent" |
 * | 60-79   | "Good"      |
 * | 40-59   | "Fair"      |
 * | 0-39    | "Low"       |
 *
 * @param score - Trust score (0-100).
 * @returns Human-readable label.
 */
export function getTrustScoreLabel(score: number): string {
  const clamped = clamp(score, 0, 100);
  if (clamped >= 80) return "Excellent";
  if (clamped >= 60) return "Good";
  if (clamped >= 40) return "Fair";
  return "Low";
}
