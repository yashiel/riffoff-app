import type { Models } from "node-appwrite";

/** User roles — matches Appwrite enum on profiles collection */
export type UserRole = "attendee" | "artist" | "organiser" | "admin";

/** Event status — matches Appwrite enum */
export type EventStatus = "draft" | "published" | "cancelled" | "completed";

/** Reservation status — matches Appwrite enum */
export type ReservationStatus = "held" | "converted" | "expired" | "cancelled";

/** Order status — matches Appwrite enum */
export type OrderStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "disputed";

/** Payment provider — matches Appwrite enum */
export type PaymentProvider = "stripe" | "paypal" | "tng";

/** Ticket status — matches Appwrite enum */
export type TicketStatus = "active" | "void" | "refunded";

/** RSVP status — matches Appwrite enum */
export type RSVPStatus = "interested" | "notgoing" | "going";

/** Application status — matches Appwrite enum */
export type ApplicationStatus =
  | "submitted"
  | "shortlisted"
  | "accepted"
  | "rejected"
  | "withdrawn";

/** Notification type — matches Appwrite enum */
export type NotificationType =
  | "ticket_purchased"
  | "event_published"
  | "event_cancelled"
  | "application_submitted"
  | "application_accepted"
  | "application_rejected"
  | "application_shortlisted"
  | "checkin_complete"
  | "system";

/** Consent type — matches Appwrite enum */
export type ConsentType =
  | "marketing_email"
  | "analytics"
  | "third_party_sharing"
  | "terms_of_service"
  | "privacy_policy";

/** Deletion request status — matches Appwrite enum */
export type DeletionRequestStatus = "pending" | "processing" | "completed" | "cancelled";

/** Message thread type — matches Appwrite enum */
export type ThreadType = "application" | "event";

/** Dispute status — matches Appwrite enum */
export type DisputeStatus =
  | "open"
  | "needs_response"
  | "submitted"
  | "won"
  | "lost";

// ─── Document Types ───────────────────────────────────────────

export interface ProfileDoc extends Models.Document {
  userId: string;
  displayName: string | null;
  photoUrl: string | null;
  role: UserRole;
  phone: string | null;
  // Preferences
  timezone: string | null;
  language: string | null;
  deactivatedAt: string | null;
  // Artist-specific fields (nullable for non-artists)
  bio: string | null;
  artistGenres: string[];
  socialLinks: string[];
  portfolioUrls: string[];
}

export interface VenueDoc extends Models.Document {
  name: string;
  address: string | null;
  geo: { type: "Point"; coordinates: [number, number] } | null;
}

export interface EventDoc extends Models.Document {
  organiserId: string;
  venueId: string;
  title: string;
  description: string | null;
  genres: string[];
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  capacity: number;
  coverimageUrl: string | null;
  videoUrl: string | null;
  isFree: boolean;
}

export interface TicketTierDoc extends Models.Document {
  eventId: string;
  name: string;
  price: number;
  currency: string;
  quota: number;
  soldCount: number;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  sortOrder: number;
}

export interface ReservationDoc extends Models.Document {
  eventId: string;
  tierId: string;
  userId: string;
  qty: number;
  status: ReservationStatus;
  expiresAt: string;
  idempotencyKey: string;
  orderId: string | null;
  holdToken: string | null;
}

export interface OrderDoc extends Models.Document {
  userId: string;
  eventId: string;
  provider: PaymentProvider;
  status: OrderStatus;
  amount: number;
  currency: string;
  providerRef: string;
  idempotencyKey: string;
  paidAt: string | null;
  failureReason: string | null;
}

export interface TicketDoc extends Models.Document {
  orderId: string;
  eventId: string;
  tierId: string;
  ownerId: string;
  status: TicketStatus;
  qrNonceHash: string;
  checkedInAt: string | null;
  checkedInBy: string | null;
  ticketCode: string;
}

export interface RSVPDoc extends Models.Document {
  eventId: string;
  userId: string;
  status: RSVPStatus;
}

export interface ApplicationDoc extends Models.Document {
  eventId: string;
  artistId: string;
  status: ApplicationStatus;
  messageThreadId: string | null;
  submittedAt: string;
  notes: string | null;
}

export interface MessageDoc extends Models.Document {
  threadType: ThreadType;
  threadId: string;
  senderId: string;
  body: string;
  attachmentUrl: string | null;
}

export interface DisputeDoc extends Models.Document {
  provider: PaymentProvider;
  orderId: string;
  providerCaseId: string;
  status: DisputeStatus;
  deadlineAt: string | null;
  reason: string | null;
  amount: number;
  openedAt: string;
}

export interface AuditLogDoc extends Models.Document {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: string | null;
}

export interface NotificationDoc extends Models.Document {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl: string | null;
  readAt: string | null;
  metadata: string | null;
}

export interface UserConsentDoc extends Models.Document {
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt: string;
  revokedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface DeletionRequestDoc extends Models.Document {
  userId: string;
  reason: string | null;
  status: DeletionRequestStatus;
  requestedAt: string;
  scheduledDeleteAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface VerificationCodeDoc extends Models.Document {
  email: string;
  code: string;
  userId: string;
  expiresAt: string;
  attempts: number;
  used: boolean;
}
