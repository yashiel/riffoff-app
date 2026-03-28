export const DATABASE_ID = "riffoff";

export const COLLECTIONS = {
  PROFILES: "profiles",
  VENUES: "venues",
  EVENTS: "events",
  TICKET_TIERS: "tickettiers",
  RESERVATIONS: "reservations",
  ORDERS: "orders",
  TICKETS: "tickets",
  RSVPS: "rsvps",
  APPLICATIONS: "applications",
  MESSAGES: "messages",
  DISPUTES: "disputes",
  AUDIT_LOGS: "auditlogs",
  NOTIFICATIONS: "notifications",
  USER_CONSENTS: "user-consents",
  DELETION_REQUESTS: "deletion-requests",
  VERIFICATION_CODES: "verification-codes",
  GATES: "gates",
  GATE_SESSIONS: "gate-sessions",
  GATE_CHECKINS: "gate-checkins",
  SIGNING_KEYS: "signing-keys",
  GATE_ACCESS_PINS: "gate-access-pins",
  GATE_MESSAGES: "gate-messages",
  MODERATION_ITEMS: "moderation-items",
  MODERATION_NOTES: "moderation-notes",
  USER_WARNINGS: "user-warnings",
  EVENT_RATINGS: "event-ratings",
  APPEALS: "appeals",
} as const;

export const BUCKETS = {
  EVENT_MEDIA: "event-media",
  ARTIST_RIDERS: "artist-riders",
  DISPUTE_EVIDENCE: "dispute-evidence",
  PROFILE_AVATARS: "profile-avatars",
} as const;

export const TEAMS = {
  ADMINS: "admins",
  ORGANISERS: "organisers",
  ARTISTS: "artists",
} as const;

export type CollectionId = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
export type BucketId = (typeof BUCKETS)[keyof typeof BUCKETS];
export type TeamId = (typeof TEAMS)[keyof typeof TEAMS];

/** Cookie name for Appwrite session */
export const SESSION_COOKIE_NAME = "riffoff-session";
