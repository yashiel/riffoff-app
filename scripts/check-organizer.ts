import { Client, Databases, Query, Users } from "node-appwrite";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);
const db = new Databases(client);
const users = new Users(client);

async function check() {
  // 1. Get the Appwrite auth user
  const user = await users.get("test-organizer-qa");
  console.log("Auth user ID:", user.$id);
  console.log("Auth user email:", user.email);

  // 2. Get the profile
  const profiles = await db.listDocuments("riffoff", "profiles", [
    Query.equal("userId", "test-organizer-qa"),
  ]);
  console.log("\nProfile count:", profiles.total);
  if (profiles.documents.length > 0) {
    const p = profiles.documents[0];
    console.log("Profile $id:", p.$id);
    console.log("Profile userId:", p.userId);
    console.log("Profile role:", p.role);
    console.log("Profile displayName:", p.displayName);
  }

  // 3. Check QA events
  const qaEvents = await db.listDocuments("riffoff", "events", [
    Query.equal("organiserId", "test-organizer-qa"),
    Query.limit(25),
  ]);
  console.log("\nEvents with organiserId='test-organizer-qa':", qaEvents.total);
  for (const e of qaEvents.documents) {
    console.log(`  ${e.$id}: ${e.title}`);
  }

  // 4. Check what the dashboard query might use
  // Maybe it queries by user.$id which might be different
  const allQA = await db.listDocuments("riffoff", "events", [
    Query.startsWith("$id", "qa-evt-"),
    Query.limit(25),
  ]);
  console.log("\nAll qa-evt-* events:", allQA.total);
  for (const e of allQA.documents) {
    console.log(`  ${e.$id}: organiserId=${e.organiserId}`);
  }
}
check().catch(console.error);
