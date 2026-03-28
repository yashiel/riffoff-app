/**
 * Create moderation system collections in Appwrite Cloud.
 * Run: cd src/musicticketing && npx tsx scripts/create-moderation-collections.ts
 */
import { Client, Databases } from "node-appwrite";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);

const db = new Databases(client);
const DB = "riffoff";

interface Attr {
  key: string;
  type: "string" | "integer" | "float" | "boolean" | "enum";
  size?: number;
  required?: boolean;
  default?: unknown;
  elements?: string[];
}

interface Idx {
  key: string;
  type?: string;
  attributes: string[];
  orders?: string[];
}

async function createCollectionSafe(id: string, name: string, attrs: Attr[], indexes: Idx[]) {
  try {
    await db.createCollection(DB, id, name);
    console.log("Created collection:", id);
  } catch (e: any) {
    if (e.message?.includes("already exists")) {
      console.log("Collection exists:", id);
    } else {
      console.error("Error creating", id, ":", e.message);
      return;
    }
  }

  for (const attr of attrs) {
    try {
      if (attr.type === "string") {
        await db.createStringAttribute(DB, id, attr.key, attr.size || 255, attr.required ?? false, attr.default as string ?? undefined);
      } else if (attr.type === "integer") {
        await db.createIntegerAttribute(DB, id, attr.key, attr.required ?? false, undefined, undefined, attr.default as number ?? undefined);
      } else if (attr.type === "boolean") {
        await db.createBooleanAttribute(DB, id, attr.key, attr.required ?? false, attr.default as boolean ?? undefined);
      } else if (attr.type === "enum") {
        await db.createEnumAttribute(DB, id, attr.key, attr.elements!, attr.required ?? false, attr.default as string ?? undefined);
      }
      console.log("  + attr:", attr.key);
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        console.log("  = attr exists:", attr.key);
      } else {
        console.error("  ! attr error:", attr.key, e.message);
      }
    }
  }

  // Wait for attributes to be available
  console.log("  Waiting for attributes...");
  await new Promise((r) => setTimeout(r, 4000));

  for (const idx of indexes) {
    try {
      await db.createIndex(DB, id, idx.key, idx.type || "key", idx.attributes, idx.orders);
      console.log("  + index:", idx.key);
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        console.log("  = index exists:", idx.key);
      } else {
        console.error("  ! index error:", idx.key, e.message);
      }
    }
  }
}

async function main() {
  console.log("=== Creating Moderation Collections ===\n");

  // 1. moderation-items
  await createCollectionSafe("moderation-items", "Moderation Items", [
    { key: "entityType", type: "enum", elements: ["event", "user", "message", "review"], required: true },
    { key: "entityId", type: "string", size: 100, required: true },
    { key: "source", type: "enum", elements: ["user", "system", "admin"], required: true },
    { key: "reporterId", type: "string", size: 100 },
    { key: "reason", type: "enum", elements: ["spam", "fraud", "harassment", "inappropriate", "duplicate", "scam", "impersonation", "other"], required: true },
    { key: "description", type: "string", size: 2000 },
    { key: "status", type: "enum", elements: ["open", "in_review", "actioned", "dismissed"], required: true, default: "open" },
    { key: "priority", type: "enum", elements: ["low", "medium", "high", "critical"], required: true, default: "low" },
    { key: "assignedTo", type: "string", size: 100 },
    { key: "actionTaken", type: "string", size: 255 },
    { key: "resolvedAt", type: "string", size: 100 },
    { key: "resolvedBy", type: "string", size: 100 },
  ], [
    { key: "status_priority", attributes: ["status", "priority"] },
    { key: "entity_lookup", attributes: ["entityType", "entityId"] },
    { key: "reporterId_idx", attributes: ["reporterId"] },
    { key: "assignedTo_idx", attributes: ["assignedTo"] },
  ]);

  // 2. moderation-notes
  await createCollectionSafe("moderation-notes", "Moderation Notes", [
    { key: "moderationItemId", type: "string", size: 100, required: true },
    { key: "authorId", type: "string", size: 100, required: true },
    { key: "body", type: "string", size: 5000, required: true },
  ], [
    { key: "moderationItemId_idx", attributes: ["moderationItemId"] },
  ]);

  // 3. user-warnings
  await createCollectionSafe("user-warnings", "User Warnings", [
    { key: "userId", type: "string", size: 100, required: true },
    { key: "level", type: "enum", elements: ["warning", "temp_ban", "permanent_ban"], required: true },
    { key: "reason", type: "string", size: 2000, required: true },
    { key: "moderationItemId", type: "string", size: 100 },
    { key: "issuedBy", type: "string", size: 100, required: true },
    { key: "expiresAt", type: "string", size: 100 },
    { key: "liftedAt", type: "string", size: 100 },
    { key: "liftedBy", type: "string", size: 100 },
  ], [
    { key: "userId_idx", attributes: ["userId"] },
  ]);

  // 4. event-ratings
  await createCollectionSafe("event-ratings", "Event Ratings", [
    { key: "eventId", type: "string", size: 100, required: true },
    { key: "userId", type: "string", size: 100, required: true },
    { key: "rating", type: "integer", required: true },
    { key: "comment", type: "string", size: 2000 },
    { key: "organiserId", type: "string", size: 100, required: true },
  ], [
    { key: "eventId_idx", attributes: ["eventId"] },
    { key: "userId_eventId_idx", attributes: ["userId", "eventId"] },
    { key: "organiserId_idx", attributes: ["organiserId"] },
  ]);

  // 5. appeals
  await createCollectionSafe("appeals", "Appeals", [
    { key: "moderationItemId", type: "string", size: 100, required: true },
    { key: "appealerId", type: "string", size: 100, required: true },
    { key: "reason", type: "string", size: 5000, required: true },
    { key: "status", type: "enum", elements: ["pending", "under_review", "upheld", "overturned"], required: true, default: "pending" },
    { key: "reviewedBy", type: "string", size: 100 },
    { key: "reviewNote", type: "string", size: 5000 },
    { key: "resolvedAt", type: "string", size: 100 },
  ], [
    { key: "moderationItemId_idx", attributes: ["moderationItemId"] },
    { key: "status_idx", attributes: ["status"] },
  ]);

  // 6. Add new fields to existing profiles collection
  console.log("\n=== Adding fields to profiles ===");
  const profileAttrs: Attr[] = [
    { key: "warningCount", type: "integer", default: 0 },
    { key: "banLevel", type: "enum", elements: ["none", "warned", "temp_banned", "permanent_banned"], default: "none" },
    { key: "banExpiresAt", type: "string", size: 100 },
    { key: "trustScore", type: "integer", default: 50 },
    { key: "isVerified", type: "boolean", default: false },
    { key: "communityRole", type: "enum", elements: ["member", "guardian"], default: "member" },
    { key: "totalEventsAttended", type: "integer", default: 0 },
  ];

  for (const attr of profileAttrs) {
    try {
      if (attr.type === "string") {
        await db.createStringAttribute(DB, "profiles", attr.key, attr.size || 255, false, attr.default as string ?? undefined);
      } else if (attr.type === "integer") {
        await db.createIntegerAttribute(DB, "profiles", attr.key, false, undefined, undefined, attr.default as number ?? undefined);
      } else if (attr.type === "boolean") {
        await db.createBooleanAttribute(DB, "profiles", attr.key, false, attr.default as boolean ?? undefined);
      } else if (attr.type === "enum") {
        await db.createEnumAttribute(DB, "profiles", attr.key, attr.elements!, false, attr.default as string ?? undefined);
      }
      console.log("  + profiles." + attr.key);
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        console.log("  = profiles." + attr.key + " exists");
      } else {
        console.error("  ! profiles." + attr.key + ":", e.message);
      }
    }
  }

  console.log("\n=== Done! ===");
}

main().catch(console.error);
