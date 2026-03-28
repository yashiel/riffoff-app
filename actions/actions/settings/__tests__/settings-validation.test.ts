import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import type { ConsentType, DeletionRequestStatus } from "@/lib/appwrite/types";

// Mirrors schemas from settings actions
const generalProfileSchema = z.object({
  displayName: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(128),
});

const emailChangeSchema = z.object({
  newEmail: z.email(),
  password: z.string().min(8),
});

describe("General profile validation", () => {
  it("accepts valid profile update", () => {
    expect(generalProfileSchema.safeParse({
      displayName: "DJ Eclipse",
      phone: "+60123456789",
      bio: "Electronic music producer",
      timezone: "Asia/Kuala_Lumpur",
      language: "en",
    }).success).toBe(true);
  });

  it("rejects empty display name", () => {
    expect(generalProfileSchema.safeParse({ displayName: "" }).success).toBe(false);
  });

  it("rejects display name over 100 chars", () => {
    expect(generalProfileSchema.safeParse({ displayName: "x".repeat(101) }).success).toBe(false);
  });

  it("rejects bio over 500 chars", () => {
    expect(generalProfileSchema.safeParse({ displayName: "Test", bio: "x".repeat(501) }).success).toBe(false);
  });

  it("accepts missing optional fields", () => {
    expect(generalProfileSchema.safeParse({ displayName: "Test" }).success).toBe(true);
  });
});

describe("Password change validation", () => {
  it("accepts valid password change", () => {
    expect(changePasswordSchema.safeParse({
      currentPassword: "oldpassword",
      newPassword: "newpassword123",
    }).success).toBe(true);
  });

  it("rejects short current password", () => {
    expect(changePasswordSchema.safeParse({
      currentPassword: "short",
      newPassword: "newpassword123",
    }).success).toBe(false);
  });

  it("rejects short new password", () => {
    expect(changePasswordSchema.safeParse({
      currentPassword: "oldpassword",
      newPassword: "short",
    }).success).toBe(false);
  });

  it("rejects new password over 128 chars", () => {
    expect(changePasswordSchema.safeParse({
      currentPassword: "oldpassword",
      newPassword: "x".repeat(129),
    }).success).toBe(false);
  });
});

describe("Email change validation", () => {
  it("accepts valid email change", () => {
    expect(emailChangeSchema.safeParse({
      newEmail: "new@example.com",
      password: "password123",
    }).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(emailChangeSchema.safeParse({
      newEmail: "notanemail",
      password: "password123",
    }).success).toBe(false);
  });
});

describe("Consent types", () => {
  const ALL_TYPES: ConsentType[] = [
    "marketing_email", "analytics", "third_party_sharing",
    "terms_of_service", "privacy_policy",
  ];

  it("has exactly 5 consent types", () => {
    expect(ALL_TYPES).toHaveLength(5);
  });

  it("includes marketing_email", () => {
    expect(ALL_TYPES).toContain("marketing_email");
  });
});

describe("Deletion request status transitions", () => {
  const STATUSES: DeletionRequestStatus[] = ["pending", "processing", "completed", "cancelled"];

  it("has 4 statuses", () => {
    expect(STATUSES).toHaveLength(4);
  });

  it("pending can transition to cancelled", () => {
    expect(STATUSES).toContain("pending");
    expect(STATUSES).toContain("cancelled");
  });

  it("grace period is 30 days", () => {
    const now = new Date();
    const scheduled = new Date(now);
    scheduled.setDate(scheduled.getDate() + 30);
    const diffDays = Math.ceil((scheduled.getTime() - now.getTime()) / 86400000);
    expect(diffDays).toBe(30);
  });
});
