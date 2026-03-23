import { describe, it, expect } from "vitest";
import {
  DATABASE_ID,
  COLLECTIONS,
  BUCKETS,
  TEAMS,
  SESSION_COOKIE_NAME,
} from "../config";

describe("Appwrite config", () => {
  it("DATABASE_ID matches Appwrite project", () => {
    expect(DATABASE_ID).toBe("riffoff");
  });

  it("has all 13 collection IDs", () => {
    const collectionValues = Object.values(COLLECTIONS);
    expect(collectionValues).toHaveLength(13);

    // Verify each collection ID matches Appwrite table names
    expect(COLLECTIONS.PROFILES).toBe("profiles");
    expect(COLLECTIONS.VENUES).toBe("venues");
    expect(COLLECTIONS.EVENTS).toBe("events");
    expect(COLLECTIONS.TICKET_TIERS).toBe("tickettiers");
    expect(COLLECTIONS.RESERVATIONS).toBe("reservations");
    expect(COLLECTIONS.ORDERS).toBe("orders");
    expect(COLLECTIONS.TICKETS).toBe("tickets");
    expect(COLLECTIONS.RSVPS).toBe("rsvps");
    expect(COLLECTIONS.APPLICATIONS).toBe("applications");
    expect(COLLECTIONS.MESSAGES).toBe("messages");
    expect(COLLECTIONS.DISPUTES).toBe("disputes");
    expect(COLLECTIONS.AUDIT_LOGS).toBe("auditlogs");
    expect(COLLECTIONS.NOTIFICATIONS).toBe("notifications");
  });

  it("has all 3 bucket IDs", () => {
    expect(Object.values(BUCKETS)).toHaveLength(3);
    expect(BUCKETS.EVENT_MEDIA).toBe("event-media");
    expect(BUCKETS.ARTIST_RIDERS).toBe("artist-riders");
    expect(BUCKETS.DISPUTE_EVIDENCE).toBe("dispute-evidence");
  });

  it("has all 3 team IDs", () => {
    expect(Object.values(TEAMS)).toHaveLength(3);
    expect(TEAMS.ADMINS).toBe("admins");
    expect(TEAMS.ORGANISERS).toBe("organisers");
    expect(TEAMS.ARTISTS).toBe("artists");
  });

  it("has a session cookie name", () => {
    expect(SESSION_COOKIE_NAME).toBe("riffoff-session");
    expect(SESSION_COOKIE_NAME).not.toContain(" ");
  });

  it("collection IDs are all lowercase", () => {
    for (const id of Object.values(COLLECTIONS)) {
      expect(id).toBe(id.toLowerCase());
    }
  });

  it("bucket IDs use kebab-case", () => {
    for (const id of Object.values(BUCKETS)) {
      expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });
});
