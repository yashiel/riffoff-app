/**
 * Gate Scanner Collections Seed Script
 *
 * Creates Appwrite collections for the gate scanner infrastructure:
 * gates, gate-sessions, gate-checkins, signing-keys, gate-access-pins, gate-messages
 *
 * Usage:
 *   npx tsx scripts/seed-gate-collections.ts
 *
 * Requires: .env.local in src/musicticketing/ with APPWRITE credentials
 */

import { Client, Databases, IndexType } from "node-appwrite";
import * as dotenv from "dotenv";
import * as path from "path";

// Load env from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const DATABASE_ID = "riffoff";

// ─── Appwrite Client ────────────────────────────────────
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);

const databases = new Databases(client);

// ─── Helpers ─────────────────────────────────────────────

async function createCollection(id: string, name: string) {
  try {
    await databases.createCollection(DATABASE_ID, id, name);
    console.log(`  ✓ Collection created: ${name} (${id})`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already exists")) {
      console.log(`  ⊘ Collection ${name} already exists — skipping`);
    } else {
      console.error(`  ✗ Collection ${name}: ${message}`);
      throw err;
    }
  }
}

async function createStringAttr(
  collectionId: string,
  key: string,
  size: number,
  required: boolean,
  defaultValue?: string
) {
  try {
    await databases.createStringAttribute(
      DATABASE_ID,
      collectionId,
      key,
      size,
      required,
      defaultValue
    );
    console.log(`    + ${collectionId}.${key} (string)`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already exists")) {
      console.log(`    ⊘ ${collectionId}.${key} already exists`);
    } else {
      console.error(`    ✗ ${collectionId}.${key}: ${message}`);
    }
  }
}

async function createIntAttr(
  collectionId: string,
  key: string,
  required: boolean,
  defaultValue?: number
) {
  try {
    await databases.createIntegerAttribute(
      DATABASE_ID,
      collectionId,
      key,
      required,
      undefined,
      undefined,
      defaultValue
    );
    console.log(`    + ${collectionId}.${key} (integer)`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already exists")) {
      console.log(`    ⊘ ${collectionId}.${key} already exists`);
    } else {
      console.error(`    ✗ ${collectionId}.${key}: ${message}`);
    }
  }
}

async function createBoolAttr(
  collectionId: string,
  key: string,
  required: boolean,
  defaultValue?: boolean
) {
  try {
    await databases.createBooleanAttribute(
      DATABASE_ID,
      collectionId,
      key,
      required,
      defaultValue
    );
    console.log(`    + ${collectionId}.${key} (boolean)`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already exists")) {
      console.log(`    ⊘ ${collectionId}.${key} already exists`);
    } else {
      console.error(`    ✗ ${collectionId}.${key}: ${message}`);
    }
  }
}

async function createEnumAttr(
  collectionId: string,
  key: string,
  elements: string[],
  required: boolean,
  defaultValue?: string
) {
  try {
    await databases.createEnumAttribute(
      DATABASE_ID,
      collectionId,
      key,
      elements,
      required,
      defaultValue
    );
    console.log(`    + ${collectionId}.${key} (enum: [${elements.join(", ")}])`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already exists")) {
      console.log(`    ⊘ ${collectionId}.${key} already exists`);
    } else {
      console.error(`    ✗ ${collectionId}.${key}: ${message}`);
    }
  }
}

async function createDatetimeAttr(
  collectionId: string,
  key: string,
  required: boolean
) {
  try {
    await databases.createDatetimeAttribute(
      DATABASE_ID,
      collectionId,
      key,
      required
    );
    console.log(`    + ${collectionId}.${key} (datetime)`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already exists")) {
      console.log(`    ⊘ ${collectionId}.${key} already exists`);
    } else {
      console.error(`    ✗ ${collectionId}.${key}: ${message}`);
    }
  }
}

async function createIndex(
  collectionId: string,
  key: string,
  type: IndexType,
  attributes: string[],
  orders?: string[]
) {
  try {
    await databases.createIndex(
      DATABASE_ID,
      collectionId,
      key,
      type,
      attributes,
      orders
    );
    console.log(`    ⊕ Index: ${collectionId}.${key}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already exists")) {
      console.log(`    ⊘ Index ${collectionId}.${key} already exists`);
    } else {
      console.error(`    ✗ Index ${collectionId}.${key}: ${message}`);
    }
  }
}

// Small delay to allow Appwrite to process attribute creation
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Seed Functions ──────────────────────────────────────

async function seedGates() {
  console.log("\n── gates ──");
  await createCollection("gates", "Gates");
  await createStringAttr("gates", "eventId", 36, true);
  await createStringAttr("gates", "name", 255, true);
  await createIntAttr("gates", "capacity", false, 0);
  await createIntAttr("gates", "sortOrder", false, 0);
  await createEnumAttr("gates", "status", ["open", "locked", "closed"], false, "open");

  await wait(2000); // Wait for attributes to be available

  await createIndex("gates", "idx_eventId", IndexType.Key, ["eventId"]);
}

async function seedGateSessions() {
  console.log("\n── gate-sessions ──");
  await createCollection("gate-sessions", "Gate Sessions");
  await createStringAttr("gate-sessions", "eventId", 36, true);
  await createStringAttr("gate-sessions", "gateId", 36, true);
  await createStringAttr("gate-sessions", "deviceId", 255, true);
  await createStringAttr("gate-sessions", "deviceFingerprint", 512, true);
  await createStringAttr("gate-sessions", "issuedBy", 36, true);
  await createEnumAttr(
    "gate-sessions",
    "status",
    ["active", "revoked", "expired"],
    false,
    "active"
  );
  await createDatetimeAttr("gate-sessions", "expiresAt", true);
  await createDatetimeAttr("gate-sessions", "lastSeenAt", false);

  await wait(2000);

  await createIndex("gate-sessions", "idx_eventId", IndexType.Key, ["eventId"]);
  await createIndex("gate-sessions", "idx_gateId", IndexType.Key, ["gateId"]);
  await createIndex("gate-sessions", "idx_deviceId", IndexType.Key, ["deviceId"]);
  await createIndex("gate-sessions", "idx_status", IndexType.Key, ["status"]);
}

async function seedGateCheckins() {
  console.log("\n── gate-checkins ──");
  await createCollection("gate-checkins", "Gate Check-ins");
  await createStringAttr("gate-checkins", "ticketId", 36, true);
  await createStringAttr("gate-checkins", "eventId", 36, true);
  await createStringAttr("gate-checkins", "gateId", 36, true);
  await createStringAttr("gate-checkins", "sessionId", 36, true);
  await createStringAttr("gate-checkins", "deviceId", 255, true);
  await createDatetimeAttr("gate-checkins", "scannedAt", true);
  await createDatetimeAttr("gate-checkins", "syncedAt", false);
  await createEnumAttr(
    "gate-checkins",
    "status",
    ["confirmed", "conflicted", "rejected"],
    false,
    "confirmed"
  );
  await createStringAttr("gate-checkins", "conflictWith", 36, false);
  await createBoolAttr("gate-checkins", "offlineMode", false, false);

  await wait(2000);

  await createIndex("gate-checkins", "idx_ticketId", IndexType.Key, ["ticketId"]);
  await createIndex("gate-checkins", "idx_eventId", IndexType.Key, ["eventId"]);
  await createIndex("gate-checkins", "idx_gateId", IndexType.Key, ["gateId"]);
  await createIndex("gate-checkins", "idx_scannedAt", IndexType.Key, ["scannedAt"], ["DESC"]);
}

async function seedSigningKeys() {
  console.log("\n── signing-keys ──");
  await createCollection("signing-keys", "Signing Keys");
  await createStringAttr("signing-keys", "publicKey", 4096, true);
  await createStringAttr("signing-keys", "encryptedPrivateKey", 8192, true);
  await createBoolAttr("signing-keys", "active", false, true);
  await createDatetimeAttr("signing-keys", "validUntil", false);
}

async function seedGateAccessPins() {
  console.log("\n── gate-access-pins ──");
  await createCollection("gate-access-pins", "Gate Access PINs");
  await createStringAttr("gate-access-pins", "eventId", 36, true);
  await createStringAttr("gate-access-pins", "pin", 64, true);
  await createStringAttr("gate-access-pins", "gateId", 36, false);
  await createStringAttr("gate-access-pins", "createdBy", 36, true);
  await createDatetimeAttr("gate-access-pins", "expiresAt", true);
  await createIntAttr("gate-access-pins", "usedCount", false, 0);
  await createIntAttr("gate-access-pins", "maxUses", false, 50);

  await wait(2000);

  await createIndex("gate-access-pins", "idx_eventId", IndexType.Key, ["eventId"]);
  await createIndex("gate-access-pins", "idx_pin", IndexType.Key, ["pin"]);
}

async function seedGateMessages() {
  console.log("\n── gate-messages ──");
  await createCollection("gate-messages", "Gate Messages");
  await createStringAttr("gate-messages", "eventId", 36, true);
  await createStringAttr("gate-messages", "gateId", 36, false);
  await createStringAttr("gate-messages", "message", 2048, true);
  await createStringAttr("gate-messages", "createdBy", 36, true);

  await wait(2000);

  await createIndex("gate-messages", "idx_eventId", IndexType.Key, ["eventId"]);
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log("🔧 Seeding gate scanner collections...\n");
  console.log(`  Endpoint: ${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}`);
  console.log(`  Project:  ${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`);
  console.log(`  Database: ${DATABASE_ID}`);

  await seedGates();
  await seedGateSessions();
  await seedGateCheckins();
  await seedSigningKeys();
  await seedGateAccessPins();
  await seedGateMessages();

  console.log("\n✅ Gate scanner collections seeded successfully!");
}

main().catch((err) => {
  console.error("\n❌ Seed failed:", err);
  process.exit(1);
});
