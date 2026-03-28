"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import type {
  ModerationPriority,
  ModerationReason,
} from "@/lib/appwrite/types";

// ── Types ────────────────────────────────────────────────────

export interface FraudSignal {
  ruleId: string;
  reason: string;
  description: string;
  priority: ModerationPriority;
  entityType: "event" | "user";
  entityId: string;
}

// ── Constants ────────────────────────────────────────────────

const ONE_HOUR_MS = 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * ONE_HOUR_MS;
const TWENTY_FOUR_HOURS_MS = 24 * ONE_HOUR_MS;

/** Max ticket price in cents that a new account (<24h) can set before flagging ($500). */
const NEW_ACCOUNT_HIGH_VALUE_THRESHOLD = 50_000;

/** Max events an organiser can create in 1 hour before flagging. */
const RAPID_EVENT_CREATION_THRESHOLD = 5;

/** Max cancellations by an organiser in 30 days before flagging. */
const HIGH_CANCELLATION_THRESHOLD = 3;

/** Max tickets a user can purchase in 1 hour before flagging. */
const MASS_TICKET_THRESHOLD = 10;

/** Max refunded orders on an event in 1 hour before flagging. */
const RAPID_REFUND_THRESHOLD = 5;

/** Window (ms) for duplicate event detection: +/- 2 hours from startsAt. */
const DUPLICATE_WINDOW_MS = 2 * ONE_HOUR_MS;

// ── Helpers ──────────────────────────────────────────────────

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

// ── Rule 1: FRAUD-01 — Duplicate event detection ────────────

export async function checkDuplicateEvent(
  eventId: string,
  organiserId: string,
  title: string,
  startsAt: string,
): Promise<FraudSignal | null> {
  try {
    const { databases } = await createAdminClient();

    const startsAtMs = new Date(startsAt).getTime();
    const windowStart = new Date(startsAtMs - DUPLICATE_WINDOW_MS).toISOString();
    const windowEnd = new Date(startsAtMs + DUPLICATE_WINDOW_MS).toISOString();

    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      [
        Query.equal("organiserId", organiserId),
        Query.contains("title", [title]),
        Query.greaterThan("startsAt", windowStart),
        Query.lessThan("startsAt", windowEnd),
        Query.notEqual("$id", eventId),
        Query.limit(5),
      ],
    );

    if (documents.length === 0) return null;

    return {
      ruleId: "FRAUD-01",
      reason: "fraud",
      description: `Potential duplicate event: "${title}" has ${documents.length} similar event(s) by the same organiser within a 2-hour window.`,
      priority: "high",
      entityType: "event",
      entityId: eventId,
    };
  } catch {
    // Fraud detection must never crash the main action
    return null;
  }
}

// ── Rule 2: FRAUD-03 — Rapid event creation ─────────────────

export async function checkRapidEventCreation(
  organiserId: string,
): Promise<FraudSignal | null> {
  try {
    const { databases } = await createAdminClient();

    const oneHourAgo = isoAgo(ONE_HOUR_MS);

    const { total } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      [
        Query.equal("organiserId", organiserId),
        Query.greaterThan("$createdAt", oneHourAgo),
        Query.limit(1),
        Query.select(["$id"]),
      ],
    );

    if (total < RAPID_EVENT_CREATION_THRESHOLD) return null;

    return {
      ruleId: "FRAUD-03",
      reason: "fraud",
      description: `Organiser created ${total} events in the last hour (threshold: ${RAPID_EVENT_CREATION_THRESHOLD}).`,
      priority: "high",
      entityType: "user",
      entityId: organiserId,
    };
  } catch {
    return null;
  }
}

// ── Rule 3: FRAUD-05 — New account + high-value event ───────

export async function checkNewAccountHighValue(
  organiserId: string,
  maxTicketPrice: number,
): Promise<FraudSignal | null> {
  try {
    if (maxTicketPrice <= NEW_ACCOUNT_HIGH_VALUE_THRESHOLD) return null;

    const { databases } = await createAdminClient();

    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      [
        Query.equal("userId", organiserId),
        Query.limit(1),
      ],
    );

    if (documents.length === 0) return null;

    const profile = documents[0];
    const createdAt = new Date(profile.$createdAt).getTime();
    const accountAgeMs = Date.now() - createdAt;

    if (accountAgeMs >= TWENTY_FOUR_HOURS_MS) return null;

    const accountAgeHours = Math.round(accountAgeMs / ONE_HOUR_MS);

    return {
      ruleId: "FRAUD-05",
      reason: "fraud",
      description: `New account (${accountAgeHours}h old) created a high-value event with max ticket price $${(maxTicketPrice / 100).toFixed(2)}.`,
      priority: "high",
      entityType: "user",
      entityId: organiserId,
    };
  } catch {
    return null;
  }
}

// ── Rule 4: FRAUD-06 — High cancellation rate ───────────────

export async function checkHighCancellationRate(
  organiserId: string,
): Promise<FraudSignal | null> {
  try {
    const { databases } = await createAdminClient();

    const thirtyDaysAgo = isoAgo(THIRTY_DAYS_MS);

    const { total } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      [
        Query.equal("organiserId", organiserId),
        Query.equal("status", "cancelled"),
        Query.greaterThan("$createdAt", thirtyDaysAgo),
        Query.limit(1),
        Query.select(["$id"]),
      ],
    );

    if (total < HIGH_CANCELLATION_THRESHOLD) return null;

    return {
      ruleId: "FRAUD-06",
      reason: "fraud",
      description: `Organiser has ${total} cancelled events in the last 30 days (threshold: ${HIGH_CANCELLATION_THRESHOLD}).`,
      priority: "critical",
      entityType: "user",
      entityId: organiserId,
    };
  } catch {
    return null;
  }
}

// ── Rule 5: FRAUD-04 — Mass ticket purchase ─────────────────

export async function checkMassTicketPurchase(
  userId: string,
): Promise<FraudSignal | null> {
  try {
    const { databases } = await createAdminClient();

    const oneHourAgo = isoAgo(ONE_HOUR_MS);

    const { total } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      [
        Query.equal("ownerId", userId),
        Query.greaterThan("$createdAt", oneHourAgo),
        Query.limit(1),
        Query.select(["$id"]),
      ],
    );

    if (total < MASS_TICKET_THRESHOLD) return null;

    return {
      ruleId: "FRAUD-04",
      reason: "fraud",
      description: `User purchased ${total} tickets in the last hour (threshold: ${MASS_TICKET_THRESHOLD}).`,
      priority: "medium",
      entityType: "user",
      entityId: userId,
    };
  } catch {
    return null;
  }
}

// ── Rule 6: FRAUD-07 — Rapid refund pattern ─────────────────

export async function checkRapidRefundPattern(
  eventId: string,
): Promise<FraudSignal | null> {
  try {
    const { databases } = await createAdminClient();

    const oneHourAgo = isoAgo(ONE_HOUR_MS);

    const { total } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      [
        Query.equal("eventId", eventId),
        Query.equal("status", "refunded"),
        Query.greaterThan("$createdAt", oneHourAgo),
        Query.limit(1),
        Query.select(["$id"]),
      ],
    );

    if (total < RAPID_REFUND_THRESHOLD) return null;

    return {
      ruleId: "FRAUD-07",
      reason: "fraud",
      description: `Event has ${total} refunded orders in the last hour (threshold: ${RAPID_REFUND_THRESHOLD}).`,
      priority: "high",
      entityType: "event",
      entityId: eventId,
    };
  } catch {
    return null;
  }
}

// ── Composite: Event publish fraud checks ────────────────────

export async function runEventPublishFraudChecks(
  eventId: string,
  organiserId: string,
  title: string,
  startsAt: string,
  maxTicketPrice: number,
): Promise<FraudSignal[]> {
  try {
    const results = await Promise.allSettled([
      checkDuplicateEvent(eventId, organiserId, title, startsAt),
      checkRapidEventCreation(organiserId),
      checkNewAccountHighValue(organiserId, maxTicketPrice),
      checkHighCancellationRate(organiserId),
      checkRapidRefundPattern(eventId),
    ]);

    const signals: FraudSignal[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && result.value !== null) {
        signals.push(result.value);
      }
    }

    return signals;
  } catch {
    return [];
  }
}

// ── Composite: Ticket purchase fraud checks ──────────────────

export async function runTicketPurchaseFraudChecks(
  userId: string,
): Promise<FraudSignal[]> {
  try {
    const signal = await checkMassTicketPurchase(userId);
    return signal ? [signal] : [];
  } catch {
    return [];
  }
}

// ── Helper: Create moderation item from fraud signal ─────────

export async function createFraudModerationItem(
  signal: FraudSignal,
): Promise<void> {
  try {
    const { databases } = await createAdminClient();

    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.MODERATION_ITEMS,
      ID.unique(),
      {
        entityType: signal.entityType,
        entityId: signal.entityId,
        source: "system" as const,
        reporterId: null,
        reason: signal.reason as ModerationReason,
        description: `[${signal.ruleId}] ${signal.description}`,
        status: "open" as const,
        priority: signal.priority,
        assignedTo: null,
        actionTaken: null,
        resolvedAt: null,
        resolvedBy: null,
      },
    );
  } catch {
    // Fire-and-forget: moderation item creation must never throw
  }
}
