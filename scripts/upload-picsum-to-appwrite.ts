/**
 * Download images from Picsum CDN and upload to Appwrite Storage.
 * Picsum doesn't rate-limit and serves reliable JPEGs.
 *
 * Usage: cd src/musicticketing && npx tsx scripts/upload-picsum-to-appwrite.ts
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

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location!, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", reject);
  });
}

async function uploadToAppwrite(filePath: string, fileId: string, fileName: string): Promise<string> {
  try {
    await storage.getFile(BUCKET_ID, fileId);
    console.log(`  ⊘ ${fileId} already exists`);
    return fileUrl(fileId);
  } catch { /* doesn't exist */ }

  const file = InputFile.fromPath(filePath, fileName);
  await storage.createFile(BUCKET_ID, fileId, file);
  console.log(`  ✓ ${fileId} uploaded`);
  return fileUrl(fileId);
}

// Pre-resolved Picsum CDN URLs (400x400 for artists, 1200x630 for events)
const IMAGES: { id: string; url: string; forEvent?: string }[] = [
  // Artists (400x400 square)
  { id: "artist-bts", url: "https://picsum.photos/seed/bts-photo/400/400" },
  { id: "artist-ateez", url: "https://picsum.photos/seed/ateez-photo/400/400" },
  { id: "artist-mcr", url: "https://picsum.photos/seed/mcr-photo/400/400" },
  { id: "artist-ive", url: "https://picsum.photos/seed/ive-photo/400/400" },
  { id: "artist-seventeen", url: "https://picsum.photos/seed/svt-photo/400/400" },
  { id: "artist-txt", url: "https://picsum.photos/seed/txt-photo/400/400" },
  { id: "artist-day6", url: "https://picsum.photos/seed/day6-photo/400/400" },
  { id: "artist-treasure", url: "https://picsum.photos/seed/treasure-photo/400/400" },
  { id: "artist-exo", url: "https://picsum.photos/seed/exo-photo/400/400" },
  { id: "artist-yohani", url: "https://picsum.photos/seed/yohani-photo/400/400" },
  { id: "artist-bryan", url: "https://picsum.photos/seed/bryan-photo/400/400" },
  { id: "artist-yuna", url: "https://picsum.photos/seed/yuna-photo/400/400" },

  // Event covers (1200x630 landscape)
  { id: "cover-qa-evt-01", url: "https://picsum.photos/seed/coldplay-concert/1200/630", forEvent: "qa-evt-01" },
  { id: "cover-qa-evt-02", url: "https://picsum.photos/seed/taylor-concert/1200/630", forEvent: "qa-evt-02" },
  { id: "cover-qa-evt-03", url: "https://picsum.photos/seed/ateez-concert/1200/630", forEvent: "qa-evt-03" },
  { id: "cover-qa-evt-04", url: "https://picsum.photos/seed/sb19-concert/1200/630", forEvent: "qa-evt-04" },
  { id: "cover-qa-evt-05", url: "https://picsum.photos/seed/hitc-festival/1200/630", forEvent: "qa-evt-05" },
  { id: "cover-qa-evt-06", url: "https://picsum.photos/seed/mytam-concert/1200/630", forEvent: "qa-evt-06" },
  { id: "cover-qa-evt-07", url: "https://picsum.photos/seed/yoyoma-concert/1200/630", forEvent: "qa-evt-07" },
  { id: "cover-qa-evt-08", url: "https://picsum.photos/seed/sundown-fest/1200/630", forEvent: "qa-evt-08" },
  { id: "cover-qa-evt-09", url: "https://picsum.photos/seed/lisa-concert/1200/630", forEvent: "qa-evt-09" },
  { id: "cover-qa-evt-10", url: "https://picsum.photos/seed/tanya-concert/1200/630", forEvent: "qa-evt-10" },
  { id: "cover-qa-evt-11", url: "https://picsum.photos/seed/siti-concert/1200/630", forEvent: "qa-evt-11" },
  { id: "cover-qa-evt-12", url: "https://picsum.photos/seed/benben-concert/1200/630", forEvent: "qa-evt-12" },
  { id: "cover-qa-evt-13", url: "https://picsum.photos/seed/phum-concert/1200/630", forEvent: "qa-evt-13" },
  { id: "cover-qa-evt-14", url: "https://picsum.photos/seed/techno-rave/1200/630", forEvent: "qa-evt-14" },
  { id: "cover-qa-evt-15", url: "https://picsum.photos/seed/celine-concert/1200/630", forEvent: "qa-evt-15" },
  { id: "cover-qa-evt-16", url: "https://picsum.photos/seed/kitaro-concert/1200/630", forEvent: "qa-evt-16" },
  { id: "cover-qa-evt-17", url: "https://picsum.photos/seed/oor-concert/1200/630", forEvent: "qa-evt-17" },
  { id: "cover-qa-evt-18", url: "https://picsum.photos/seed/pamungkas-concert/1200/630", forEvent: "qa-evt-18" },
  { id: "cover-qa-evt-19", url: "https://picsum.photos/seed/mcr-concert/1200/630", forEvent: "qa-evt-19" },
  { id: "cover-qa-evt-20", url: "https://picsum.photos/seed/raya-concert/1200/630", forEvent: "qa-evt-20" },
];

async function main() {
  console.log("\n🖼️  Upload images to Appwrite Storage\n");

  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const artistUrls: Record<string, string> = {};
  const eventUrls: Record<string, string> = {};

  for (const img of IMAGES) {
    const localPath = path.join(TMP_DIR, `${img.id}.jpg`);
    try {
      // Download (Picsum redirects, so follow)
      if (!fs.existsSync(localPath)) {
        await download(img.url, localPath);
        // Small delay to avoid overwhelming Picsum
        await new Promise((r) => setTimeout(r, 500));
      }

      const appwriteUrl = await uploadToAppwrite(localPath, img.id, `${img.id}.jpg`);

      if (img.id.startsWith("artist-")) {
        artistUrls[img.id] = appwriteUrl;
      }
      if (img.forEvent) {
        eventUrls[img.forEvent] = appwriteUrl;
      }
    } catch (err: unknown) {
      console.error(`  ✗ ${img.id}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Update event documents
  console.log("\n── Updating Events ─────────────────────");
  for (const [eventId, url] of Object.entries(eventUrls)) {
    try {
      await db.updateDocument(DATABASE_ID, "events", eventId, { coverimageUrl: url });
      console.log(`  ✓ ${eventId}`);
    } catch (err: unknown) {
      console.error(`  ✗ ${eventId}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Print artist URLs for code update
  console.log("\n── Artist URLs for page.tsx ─────────────");
  for (const [id, url] of Object.entries(artistUrls)) {
    console.log(`  ${id}: "${url}"`);
  }

  console.log("\n✅ Done!\n");
}

main().catch(console.error);
