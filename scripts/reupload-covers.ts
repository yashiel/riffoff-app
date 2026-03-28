/**
 * Delete scrambled event cover images from Appwrite Storage and
 * re-upload the correct ones from local cache.
 *
 * Usage: cd src/musicticketing && npx tsx scripts/reupload-covers.ts
 */
import { Client, Storage, Databases } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const BUCKET_ID = "event-media";
const DATABASE_ID = "riffoff";
const TMP_DIR = path.resolve(__dirname, "../.tmp-images");

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);

const storage = new Storage(client);
const db = new Databases(client);

function fileUrl(fileId: string): string {
  return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`;
}

const EVENT_IDS = Array.from({ length: 20 }, (_, i) =>
  `qa-evt-${String(i + 1).padStart(2, "0")}`
);

async function main() {
  console.log("\n🔄 Re-upload correct event cover images\n");

  for (const eventId of EVENT_IDS) {
    const fileId = `cover-${eventId}`;
    const localPath = path.join(TMP_DIR, `${fileId}.jpg`);

    if (!fs.existsSync(localPath)) {
      console.log(`  ⊘ ${eventId}: no local file found, skipping`);
      continue;
    }

    // Delete existing (scrambled) file
    try {
      await storage.deleteFile(BUCKET_ID, fileId);
      console.log(`  🗑️ ${fileId} deleted`);
    } catch {
      console.log(`  ⊘ ${fileId} didn't exist in storage`);
    }

    // Wait a moment to avoid rate limits
    await new Promise((r) => setTimeout(r, 200));

    // Upload correct file
    try {
      const file = InputFile.fromPath(localPath, `${fileId}.jpg`);
      await storage.createFile(BUCKET_ID, fileId, file);
      console.log(`  ✓ ${fileId} uploaded (${(fs.statSync(localPath).size / 1024).toFixed(0)}KB)`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${fileId}: ${msg}`);
      continue;
    }

    // Update event document with correct URL
    const url = fileUrl(fileId);
    try {
      await db.updateDocument(DATABASE_ID, "events", eventId, {
        coverimageUrl: url,
      });
      console.log(`  ✓ ${eventId} coverimageUrl updated`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${eventId} update failed: ${msg}`);
    }
  }

  console.log("\n✅ All done!\n");
}

main().catch(console.error);
