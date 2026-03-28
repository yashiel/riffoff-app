/**
 * Fix scrambled event cover images by mapping each QA event
 * to the correct artist image already in Appwrite Storage.
 *
 * Usage: cd src/musicticketing && npx tsx scripts/fix-event-images.ts
 */
import { Client, Databases } from "node-appwrite";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const DATABASE_ID = "riffoff";
const BUCKET_ID = "event-media";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);

const db = new Databases(client);

function fileUrl(fileId: string): string {
  return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`;
}

/**
 * Correct mapping: QA event ID → the artist file ID already in Appwrite Storage
 * These artist images are confirmed uploaded and working.
 */
const EVENT_TO_ARTIST_IMAGE: Record<string, string> = {
  // qa-evt-01: Coldplay — Music of the Spheres KL
  // No coldplay artist image, use cover-qa-evt-01 if exists, otherwise keep as is
  "qa-evt-01": "cover-qa-evt-01",

  // qa-evt-02: Taylor Swift | The Eras Tour — Singapore (Night 3)
  // No taylor swift artist image, use cover if exists
  "qa-evt-02": "cover-qa-evt-02",

  // qa-evt-03: ATEEZ — THE FELLOWSHIP Bangkok
  "qa-evt-03": "artist-ateez",

  // qa-evt-04: SB19 — PAGTATAG! World Tour Manila Homecoming
  // No SB19 artist image
  "qa-evt-04": "cover-qa-evt-04",

  // qa-evt-05: Head in the Clouds Jakarta 2026
  // Multi-artist festival, no single artist
  "qa-evt-05": "cover-qa-evt-05",

  // qa-evt-06: Mỹ Tâm — Tri Ân 25 Years Concert
  // No My Tam artist image
  "qa-evt-06": "cover-qa-evt-06",

  // qa-evt-07: Yo-Yo Ma — Solo Cello Recital
  // No Yo-Yo Ma artist image
  "qa-evt-07": "cover-qa-evt-07",

  // qa-evt-08: Sundown Music Festival Malaysia 2026
  // Festival, no single artist
  "qa-evt-08": "cover-qa-evt-08",

  // qa-evt-09: LISA — LLOUD World Tour Bangkok
  // No Lisa artist image
  "qa-evt-09": "cover-qa-evt-09",

  // qa-evt-10: Tanya Chua — 30th Anniversary Concert
  // No Tanya Chua artist image
  "qa-evt-10": "cover-qa-evt-10",

  // qa-evt-11: Siti Nurhaliza — The Royal Concert
  // No Siti artist image... but the homepage has a similar mapping
  "qa-evt-11": "cover-qa-evt-11",

  // qa-evt-12: Ben&Ben — Kuwento Tour Manila
  // No Ben&Ben artist image
  "qa-evt-12": "cover-qa-evt-12",

  // qa-evt-13: Phum Viphurit — Psychedelic Bangkok
  // No Phum artist image
  "qa-evt-13": "cover-qa-evt-13",

  // qa-evt-14: Midnight Frequency — Underground Techno Marathon
  // Festival
  "qa-evt-14": "cover-qa-evt-14",

  // qa-evt-15: Celine Dion — Courage World Tour Singapore
  // No Celine artist image
  "qa-evt-15": "cover-qa-evt-15",

  // qa-evt-16: Kitaro — Silk Road Live Colombo
  // No Kitaro artist image
  "qa-evt-16": "cover-qa-evt-16",

  // qa-evt-17: ONE OK ROCK — Luxury Disease Asia Tour
  // No ONE OK ROCK artist image
  "qa-evt-17": "cover-qa-evt-17",

  // qa-evt-18: Pamungkas — Solipsism 0.2 Tour KL
  // No Pamungkas artist image
  "qa-evt-18": "cover-qa-evt-18",

  // qa-evt-19: My Chemical Romance — The Black Parade is Dead! Asia
  "qa-evt-19": "artist-mcr",

  // qa-evt-20: Dato' Sri Siti Nurhaliza & Raihan — Aidilfitri Unity Concert
  "qa-evt-20": "cover-qa-evt-20",
};

async function main() {
  console.log("\n🔧 Fix Event Cover Images\n");
  console.log("Checking which cover files exist in storage...\n");

  const { Storage } = await import("node-appwrite");
  const storage = new Storage(client);

  // First check which cover files actually exist
  const existingCovers = new Set<string>();
  for (const fileId of Object.values(EVENT_TO_ARTIST_IMAGE)) {
    try {
      await storage.getFile(BUCKET_ID, fileId);
      existingCovers.add(fileId);
    } catch {
      // File doesn't exist
    }
  }

  console.log(`Found ${existingCovers.size} existing files in storage\n`);

  // For each event, update its coverimageUrl to the correct image
  for (const [eventId, imageFileId] of Object.entries(EVENT_TO_ARTIST_IMAGE)) {
    const url = existingCovers.has(imageFileId)
      ? fileUrl(imageFileId)
      : null;

    if (!url) {
      console.log(`  ⊘ ${eventId}: no valid image found for ${imageFileId}, skipping`);
      continue;
    }

    try {
      await db.updateDocument(DATABASE_ID, "events", eventId, {
        coverimageUrl: url,
      });
      console.log(`  ✓ ${eventId} → ${imageFileId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${eventId}: ${msg}`);
    }
  }

  console.log("\n✅ Done!\n");
}

main().catch(console.error);
