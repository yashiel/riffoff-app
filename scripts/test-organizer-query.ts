/**
 * Simulate what getOrganiserEvents() does for qa-organizer
 */
import { Client, Databases, Query, Account } from "node-appwrite";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const DATABASE_ID = "riffoff";

async function test() {
  // 1. Test with admin client (what getOrganiserEvents actually uses)
  const adminClient = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    .setKey(process.env.NEXT_APPWRITE_KEY!);
  const adminDb = new Databases(adminClient);

  const userId = "test-organizer-qa";

  // Exact same query as getOrganiserEvents for non-admin
  const queries = [
    Query.equal("organiserId", userId),
    Query.orderDesc("$createdAt"),
    Query.limit(50),
  ];

  const result = await adminDb.listDocuments(DATABASE_ID, "events", queries);
  console.log(`Admin query: ${result.total} events found`);
  for (const e of result.documents.slice(0, 5)) {
    console.log(`  ${e.$id}: ${e.title} (status=${e.status})`);
  }

  // 2. Now simulate session-based query (what the user's browser does)
  // Create a session for the organizer
  const sessionClient = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

  const account = new Account(sessionClient);
  try {
    const session = await account.createEmailPasswordSession(
      "qa-organizer@riffoff.test",
      "TestOrganizer@2026!",
    );
    console.log("\nSession created:", session.$id);

    // Now query with this session's JWT
    sessionClient.setJWT(session.providerAccessToken || "");
    const sessionDb = new Databases(sessionClient);

    // Try to list events with session client
    try {
      const sessionResult = await sessionDb.listDocuments(DATABASE_ID, "events", queries);
      console.log(`Session query: ${sessionResult.total} events found`);
    } catch (err: any) {
      console.log(`Session query failed: ${err.message}`);
    }
  } catch (err: any) {
    console.log(`Session creation failed: ${err.message}`);
  }

  // 3. Check if the organizer profile role is correct
  const profile = await adminDb.listDocuments(DATABASE_ID, "profiles", [
    Query.equal("userId", userId),
  ]);
  if (profile.documents.length > 0) {
    console.log(`\nProfile role: ${profile.documents[0].role}`);
  }

  // 4. Check events collection permissions (table-level)
  console.log("\nSample event permissions:");
  for (const id of ["qa-evt-01", "qa-evt-05", "qa-evt-10"]) {
    const doc = await adminDb.getDocument(DATABASE_ID, "events", id);
    console.log(`  ${id}: ${JSON.stringify(doc.$permissions)}`);
  }
}

test().catch(console.error);
