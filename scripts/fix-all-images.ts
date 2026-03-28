/**
 * Fix ALL event cover images — download correct artist photos and upload to Appwrite.
 * Uses smaller thumbnail sizes to avoid Wikipedia rate limits.
 *
 * Usage: cd src/musicticketing && npx tsx scripts/fix-all-images.ts
 */
import { Client, Storage, Databases } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as https from "https";

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

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "RiffOffBot/1.0 (https://riffoff.live; contact@riffoff.live) node-appwrite",
        "Accept": "image/jpeg,image/png,image/*,*/*",
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 308) {
        return download(res.headers.location!, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
      file.on("error", reject);
    }).on("error", reject);
  });
}

/**
 * CORRECT mapping: event ID → Wikipedia Commons image URL
 * Using 640px thumbnails (smaller = faster, less likely to be rate-limited)
 */
const CORRECT_IMAGES: Record<string, string> = {
  // qa-evt-01: Coldplay — Music of the Spheres World Tour KL
  "qa-evt-01": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/ColdplayBerlin2022-48_%28cropped%29.jpg/640px-ColdplayBerlin2022-48_%28cropped%29.jpg",
  // qa-evt-02: Taylor Swift | The Eras Tour — Singapore
  "qa-evt-02": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Taylor_Swift_at_the_Eras_Tour_in_Stockholm_2024_%28cropped%29.jpg/480px-Taylor_Swift_at_the_Eras_Tour_in_Stockholm_2024_%28cropped%29.jpg",
  // qa-evt-03: ATEEZ — Bangkok
  "qa-evt-03": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/ATEEZ_2024.jpg/640px-ATEEZ_2024.jpg",
  // qa-evt-04: SB19 — Manila
  "qa-evt-04": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/SB19_at_the_PPOP_CON_2022.jpg/640px-SB19_at_the_PPOP_CON_2022.jpg",
  // qa-evt-05: Head in the Clouds Jakarta (Joji)
  "qa-evt-05": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Joji_performing_at_the_O2_Academy_Brixton_in_2022_%28cropped%29.jpg/480px-Joji_performing_at_the_O2_Academy_Brixton_in_2022_%28cropped%29.jpg",
  // qa-evt-06: My Tam — Vietnam
  "qa-evt-06": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/My_Tam_concert_in_the_US.jpg/640px-My_Tam_concert_in_the_US.jpg",
  // qa-evt-07: Yo-Yo Ma — Solo Cello
  "qa-evt-07": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Yo-Yo_Ma_-_World_Economic_Forum_Annual_Meeting_2008.jpg/480px-Yo-Yo_Ma_-_World_Economic_Forum_Annual_Meeting_2008.jpg",
  // qa-evt-08: Sundown Music Festival (festival crowd)
  "qa-evt-08": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Coachella_2014_sunset.jpg/640px-Coachella_2014_sunset.jpg",
  // qa-evt-09: LISA — Bangkok
  "qa-evt-09": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Lisa_%28rapper%29_at_BVLGARI_event_in_2023_%28cropped%29.jpg/440px-Lisa_%28rapper%29_at_BVLGARI_event_in_2023_%28cropped%29.jpg",
  // qa-evt-10: Tanya Chua — 30th Anniversary
  "qa-evt-10": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Tanya_Chua_Singapore_2011_%28cropped%29.jpg/440px-Tanya_Chua_Singapore_2011_%28cropped%29.jpg",
  // qa-evt-11: Siti Nurhaliza — The Royal Concert
  "qa-evt-11": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Siti_Nurhaliza_at_AIM22.jpg/440px-Siti_Nurhaliza_at_AIM22.jpg",
  // qa-evt-12: Ben&Ben — Manila
  "qa-evt-12": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Ben%26Ben_at_Wanderland_2018.jpg/640px-Ben%26Ben_at_Wanderland_2018.jpg",
  // qa-evt-13: Phum Viphurit — Bangkok
  "qa-evt-13": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Phum_Viphurit_Way_Out_West_2019.jpg/480px-Phum_Viphurit_Way_Out_West_2019.jpg",
  // qa-evt-14: Midnight Frequency — Techno (generic techno/festival)
  "qa-evt-14": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Time_Warp_2014.jpg/640px-Time_Warp_2014.jpg",
  // qa-evt-15: Celine Dion — Singapore
  "qa-evt-15": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Celine_Dion_Concert_Singing_%27Taking_Chances%27_2008.jpg/480px-Celine_Dion_Concert_Singing_%27Taking_Chances%27_2008.jpg",
  // qa-evt-16: Kitaro — Silk Road
  "qa-evt-16": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Kitaro_in_Concert.jpg/480px-Kitaro_in_Concert.jpg",
  // qa-evt-17: ONE OK ROCK — Bangkok
  "qa-evt-17": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/One_Ok_Rock_2014.jpg/640px-One_Ok_Rock_2014.jpg",
  // qa-evt-18: Pamungkas — KL
  "qa-evt-18": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Pamungkas_performing.jpg/480px-Pamungkas_performing.jpg",
  // qa-evt-19: My Chemical Romance — Singapore
  "qa-evt-19": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/MCR-Shrine.jpg/640px-MCR-Shrine.jpg",
  // qa-evt-20: Siti Nurhaliza & Raihan
  "qa-evt-20": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Siti_Nurhaliza_at_AIM22.jpg/440px-Siti_Nurhaliza_at_AIM22.jpg",
};

async function main() {
  console.log("\n🔧 Fix ALL Event Images — Fresh Download + Upload\n");

  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  let success = 0;
  let failed = 0;

  for (const [eventId, url] of Object.entries(CORRECT_IMAGES)) {
    const fileId = `cover-${eventId}`;
    const localPath = path.join(TMP_DIR, `${fileId}.jpg`);

    console.log(`\n── ${eventId} ──`);

    // 1. Download
    try {
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath); // Always fresh
      await download(url, localPath);
      const size = fs.statSync(localPath).size;
      console.log(`  ↓ Downloaded (${(size / 1024).toFixed(0)}KB)`);

      if (size < 5000) {
        console.log(`  ⚠ File too small (${size}B) — likely an error page, skipping`);
        failed++;
        continue;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ Download failed: ${msg}`);
      failed++;
      await sleep(2000); // Wait longer after failure
      continue;
    }

    // 2. Delete old from Appwrite
    try {
      await storage.deleteFile(BUCKET_ID, fileId);
      console.log(`  🗑️ Old file deleted`);
    } catch {
      // Didn't exist
    }

    await sleep(300);

    // 3. Upload new
    try {
      const file = InputFile.fromPath(localPath, `${fileId}.jpg`);
      await storage.createFile(BUCKET_ID, fileId, file);
      console.log(`  ✓ Uploaded`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ Upload failed: ${msg}`);
      failed++;
      continue;
    }

    // 4. Update event document
    try {
      await db.updateDocument(DATABASE_ID, "events", eventId, {
        coverimageUrl: fileUrl(fileId),
      });
      console.log(`  ✓ Document updated`);
      success++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ Doc update failed: ${msg}`);
    }

    // Rate limit protection
    await sleep(1500);
  }

  console.log(`\n✅ Done! ${success} success, ${failed} failed\n`);
}

main().catch(console.error);
