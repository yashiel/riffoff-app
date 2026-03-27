import { Client, Databases } from "node-appwrite";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);
const db = new Databases(client);

const ep = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const pid = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const u = (id: string) => `${ep}/storage/buckets/event-media/files/${id}/view?project=${pid}`;

async function main() {
  // Use already-uploaded artist images for these events
  const updates: [string, string][] = [
    ["qa-evt-06", "artist-yohani"],    // Colombo fest → Yohani
    ["qa-evt-10", "artist-exo"],       // Yo-Yo Ma → EXO (fallback, both are performance photos)
    ["qa-evt-14", "artist-bryan"],     // Bryan Adams KL → Bryan Adams
    ["qa-evt-19", "artist-ateez"],     // ATEEZ World Tour → ATEEZ
  ];

  for (const [evtId, artistId] of updates) {
    try {
      await db.updateDocument("riffoff", "events", evtId, { coverimageUrl: u(artistId) });
      console.log(`✅ ${evtId} → ${artistId}`);
    } catch (e: any) {
      console.log(`❌ ${evtId}: ${e.message?.slice(0, 60)}`);
    }
  }
  console.log("\nDone!");
}
main();
