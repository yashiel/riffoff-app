/**
 * Fix event images using Wikipedia API to get REAL current image URLs.
 * Then download and upload to Appwrite.
 *
 * Usage: cd src/musicticketing && npx tsx scripts/fix-images-v2.ts
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

/** Fetch a URL and return the body as string */
function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { "User-Agent": "RiffOffBot/1.0 (https://riffoff.live; contact@riffoff.live)" }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchText(res.headers.location!).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

/** Download binary file */
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { "User-Agent": "RiffOffBot/1.0 (https://riffoff.live; contact@riffoff.live)" }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 308) {
        return downloadFile(res.headers.location!, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", reject);
  });
}

/** Use Wikipedia API to get the main image URL for a page */
async function getWikiImage(query: string): Promise<string | null> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=pageimages&format=json&pithumbsize=800`;
  const data = JSON.parse(await fetchText(searchUrl));
  const pages = data.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0] as any;
  return page?.thumbnail?.source ?? null;
}

/**
 * Event → Wikipedia search query for finding the correct artist image
 */
const EVENT_QUERIES: Record<string, string> = {
  "qa-evt-01": "Coldplay",
  "qa-evt-02": "Taylor Swift",
  "qa-evt-03": "Ateez",
  "qa-evt-04": "SB19 (group)",
  "qa-evt-05": "Joji (musician)",
  "qa-evt-06": "Mỹ Tâm",
  "qa-evt-07": "Yo-Yo Ma",
  "qa-evt-08": "Music festival",
  "qa-evt-09": "Lisa (rapper)",
  "qa-evt-10": "Tanya Chua",
  "qa-evt-11": "Siti Nurhaliza",
  "qa-evt-12": "Ben&Ben",
  "qa-evt-13": "Phum Viphurit",
  "qa-evt-14": "Techno music",
  "qa-evt-15": "Celine Dion",
  "qa-evt-16": "Kitaro",
  "qa-evt-17": "One Ok Rock",
  "qa-evt-18": "Pamungkas (singer)",
  "qa-evt-19": "My Chemical Romance",
  "qa-evt-20": "Siti Nurhaliza",
};

async function main() {
  console.log("\n🔧 Fix Event Images v2 — Wikipedia API\n");
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  let success = 0;
  let failed = 0;

  for (const [eventId, query] of Object.entries(EVENT_QUERIES)) {
    const fileId = `cover-${eventId}`;
    const localPath = path.join(TMP_DIR, `${fileId}.jpg`);

    console.log(`\n── ${eventId}: "${query}" ──`);

    // 1. Get image URL from Wikipedia API
    let imageUrl: string | null = null;
    try {
      imageUrl = await getWikiImage(query);
      if (!imageUrl) {
        console.log(`  ⚠ No image found on Wikipedia for "${query}"`);
        failed++;
        await sleep(500);
        continue;
      }
      console.log(`  🔍 Found: ${imageUrl.substring(0, 80)}...`);
    } catch (err: unknown) {
      console.error(`  ✗ API failed: ${err instanceof Error ? err.message : err}`);
      failed++;
      await sleep(1000);
      continue;
    }

    await sleep(500);

    // 2. Download
    try {
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      await downloadFile(imageUrl, localPath);
      const size = fs.statSync(localPath).size;
      console.log(`  ↓ Downloaded (${(size / 1024).toFixed(0)}KB)`);
      if (size < 3000) {
        console.log(`  ⚠ Too small, skipping`);
        failed++;
        continue;
      }
    } catch (err: unknown) {
      console.error(`  ✗ Download failed: ${err instanceof Error ? err.message : err}`);
      failed++;
      await sleep(1000);
      continue;
    }

    // 3. Delete old from Appwrite
    try {
      await storage.deleteFile(BUCKET_ID, fileId);
      console.log(`  🗑️ Old deleted`);
    } catch { /* didn't exist */ }

    await sleep(300);

    // 4. Upload new
    try {
      const file = InputFile.fromPath(localPath, `${fileId}.jpg`);
      await storage.createFile(BUCKET_ID, fileId, file);
      console.log(`  ✓ Uploaded`);
    } catch (err: unknown) {
      console.error(`  ✗ Upload: ${err instanceof Error ? err.message : err}`);
      failed++;
      continue;
    }

    // 5. Update document
    try {
      await db.updateDocument(DATABASE_ID, "events", eventId, { coverimageUrl: fileUrl(fileId) });
      console.log(`  ✓ Document updated`);
      success++;
    } catch (err: unknown) {
      console.error(`  ✗ Doc: ${err instanceof Error ? err.message : err}`);
    }

    await sleep(1000);
  }

  console.log(`\n✅ Done! ${success} success, ${failed} failed\n`);
}

main().catch(console.error);
