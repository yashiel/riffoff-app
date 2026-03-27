/**
 * Fix QA event permissions — add read/write for organizer and read for public.
 * Events created via admin API key have empty permissions (no one can read via client SDK).
 */
import { Client, Databases, Query, Permission, Role } from "node-appwrite";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);
const db = new Databases(client);

const ORGANIZER_ID = "test-organizer-qa";
const ATTENDEE_ID = "test-attendee-qa";

async function fix() {
  console.log("Checking current permissions...\n");

  const evt = await db.getDocument("riffoff", "events", "qa-evt-01");
  console.log("Current qa-evt-01 permissions:", JSON.stringify(evt.$permissions));

  // If permissions are already set, skip
  if (evt.$permissions.length > 0) {
    console.log("\nPermissions already set — checking if they need updating...");
  }

  console.log("\nFixing event permissions...");

  // Fix all QA events
  const events = await db.listDocuments("riffoff", "events", [
    Query.equal("organiserId", ORGANIZER_ID),
    Query.limit(25),
  ]);

  for (const e of events.documents) {
    await db.updateDocument("riffoff", "events", e.$id, {}, [
      Permission.read(Role.any()),
      Permission.update(Role.user(ORGANIZER_ID)),
      Permission.delete(Role.user(ORGANIZER_ID)),
    ]);
    console.log(`  ✓ events: ${e.$id}`);
  }

  // Fix ticket tiers
  console.log("\nFixing ticket tier permissions...");
  const tiers = await db.listDocuments("riffoff", "tickettiers", [
    Query.startsWith("$id", "qa-tier-"),
    Query.limit(60),
  ]);

  for (const t of tiers.documents) {
    await db.updateDocument("riffoff", "tickettiers", t.$id, {}, [
      Permission.read(Role.any()),
      Permission.update(Role.user(ORGANIZER_ID)),
    ]);
    console.log(`  ✓ tiers: ${t.$id}`);
  }

  // Fix orders
  console.log("\nFixing order permissions...");
  const orders = await db.listDocuments("riffoff", "orders", [
    Query.startsWith("$id", "qa-order-"),
    Query.limit(25),
  ]);

  for (const o of orders.documents) {
    await db.updateDocument("riffoff", "orders", o.$id, {}, [
      Permission.read(Role.user(ATTENDEE_ID)),
      Permission.read(Role.user(ORGANIZER_ID)),
    ]);
    console.log(`  ✓ orders: ${o.$id}`);
  }

  // Fix tickets
  console.log("\nFixing ticket permissions...");
  const tickets = await db.listDocuments("riffoff", "tickets", [
    Query.startsWith("$id", "qa-ticket-"),
    Query.limit(25),
  ]);

  for (const t of tickets.documents) {
    await db.updateDocument("riffoff", "tickets", t.$id, {}, [
      Permission.read(Role.user(ATTENDEE_ID)),
      Permission.update(Role.user(ATTENDEE_ID)),
    ]);
    console.log(`  ✓ tickets: ${t.$id}`);
  }

  // Fix venues
  console.log("\nFixing venue permissions...");
  const venues = await db.listDocuments("riffoff", "venues", [
    Query.startsWith("$id", "qa-venue-"),
    Query.limit(25),
  ]);

  for (const v of venues.documents) {
    await db.updateDocument("riffoff", "venues", v.$id, {}, [
      Permission.read(Role.any()),
    ]);
    console.log(`  ✓ venues: ${v.$id}`);
  }

  console.log("\n✅ All permissions fixed!");
}

fix().catch(console.error);
