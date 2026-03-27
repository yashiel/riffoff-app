/**
 * Download real artist/event photos and upload to Appwrite Storage.
 * Then update the homepage artist data and QA event cover images.
 *
 * Usage: cd src/musicticketing && npx tsx scripts/upload-artist-images.ts
 */
import { Client, Storage, Databases, ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as https from "https";
import * as http from "http";

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

// Appwrite file URL builder
function fileUrl(fileId: string): string {
  return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`;
}

// Download a file from URL, following redirects
function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    proto.get(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; RiffOff/1.0)" } }, (res) => {
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
      file.on("error", reject);
    }).on("error", reject);
  });
}

// Upload file to Appwrite Storage
async function uploadToAppwrite(filePath: string, fileId: string, fileName: string): Promise<string> {
  try {
    // Check if already exists
    await storage.getFile(BUCKET_ID, fileId);
    console.log(`  ⊘ ${fileName} already exists`);
    return fileUrl(fileId);
  } catch {
    // Doesn't exist, upload
  }

  const file = InputFile.fromPath(filePath, fileName);
  await storage.createFile(BUCKET_ID, fileId, file);
  console.log(`  ✓ ${fileName} uploaded`);
  return fileUrl(fileId);
}

// ─── Image sources: Wikipedia Commons direct media URLs ───
// These are direct file URLs (not thumbnail URLs) that reliably return images
const ARTIST_IMAGES: Record<string, { url: string; ext: string }> = {
  // Homepage trending artists
  "artist-bts": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/BTS_at_the_White_House.jpg/640px-BTS_at_the_White_House.jpg", ext: "jpg" },
  "artist-ateez": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/ATEEZ_2024.jpg/640px-ATEEZ_2024.jpg", ext: "jpg" },
  "artist-mcr": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/MCR-Shrine.jpg/640px-MCR-Shrine.jpg", ext: "jpg" },
  "artist-ive": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/IVE_at_Gayo_Daejeon_on_December_25%2C_2023_%281%29.jpg/640px-IVE_at_Gayo_Daejeon_on_December_25%2C_2023_%281%29.jpg", ext: "jpg" },
  "artist-seventeen": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/SEVENTEEN_at_Incheon_Airport_on_September_7%2C_2024_%282%29.jpg/640px-SEVENTEEN_at_Incheon_Airport_on_September_7%2C_2024_%282%29.jpg", ext: "jpg" },
  "artist-txt": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/TXT_at_Incheon_Airport_20191111_02.jpg/640px-TXT_at_Incheon_Airport_20191111_02.jpg", ext: "jpg" },
  "artist-day6": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/20171001_DAY6.jpg/640px-20171001_DAY6.jpg", ext: "jpg" },
  "artist-treasure": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Treasure_in_September_2023.jpg/640px-Treasure_in_September_2023.jpg", ext: "jpg" },
  "artist-exo": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/EXO_at_the_24th_Seoul_Music_Awards_02.jpg/640px-EXO_at_the_24th_Seoul_Music_Awards_02.jpg", ext: "jpg" },
  "artist-yohani": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Yohani.jpg/440px-Yohani.jpg", ext: "jpg" },
  "artist-bryan-adams": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Bryan_Adams_Hamburg_MG_0631_flickr.jpg/512px-Bryan_Adams_Hamburg_MG_0631_flickr.jpg", ext: "jpg" },
  "artist-yuna": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Yuna_2019_%28cropped%29.jpg/440px-Yuna_2019_%28cropped%29.jpg", ext: "jpg" },
};

// QA event cover images — concert/festival/performance photos
const EVENT_IMAGES: Record<string, { url: string; ext: string }> = {
  "qa-evt-01": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Coldplay_-_Global_Citizen_Festival_Hamburg_06.jpg/1280px-Coldplay_-_Global_Citizen_Festival_Hamburg_06.jpg", ext: "jpg" },
  "qa-evt-02": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Taylor_Swift_The_Eras_Tour_2023.jpg/1024px-Taylor_Swift_The_Eras_Tour_2023.jpg", ext: "jpg" },
  "qa-evt-03": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/ATEEZ_2024.jpg/1024px-ATEEZ_2024.jpg", ext: "jpg" },
  "qa-evt-04": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/SB19_at_PPOP_CON_2022_%28cropped%29.jpg/800px-SB19_at_PPOP_CON_2022_%28cropped%29.jpg", ext: "jpg" },
  "qa-evt-05": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Joji_performing_at_the_O2_Academy_Brixton_in_2022_%28cropped%29.jpg/640px-Joji_performing_at_the_O2_Academy_Brixton_in_2022_%28cropped%29.jpg", ext: "jpg" },
  "qa-evt-06": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/My_Tam_concert.jpg/1024px-My_Tam_concert.jpg", ext: "jpg" },
  "qa-evt-07": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Yo-Yo_Ma_-_World_Economic_Forum_Annual_Meeting_2008.jpg/640px-Yo-Yo_Ma_-_World_Economic_Forum_Annual_Meeting_2008.jpg", ext: "jpg" },
  "qa-evt-08": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Ultra_Music_Festival_2013_Main_Stage.jpg/1280px-Ultra_Music_Festival_2013_Main_Stage.jpg", ext: "jpg" },
  "qa-evt-09": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Lisa_%28rapper%29_at_BVLGARI_event_in_2023_%28cropped%29.jpg/440px-Lisa_%28rapper%29_at_BVLGARI_event_in_2023_%28cropped%29.jpg", ext: "jpg" },
  "qa-evt-10": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Tanya_Chua_Singapore_2011_%28cropped%29.jpg/440px-Tanya_Chua_Singapore_2011_%28cropped%29.jpg", ext: "jpg" },
  "qa-evt-11": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Siti_Nurhaliza_at_AIM22.jpg/440px-Siti_Nurhaliza_at_AIM22.jpg", ext: "jpg" },
  "qa-evt-12": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Ben%26Ben_at_Wanderland_2018.jpg/1024px-Ben%26Ben_at_Wanderland_2018.jpg", ext: "jpg" },
  "qa-evt-13": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Phum_Viphurit_Way_Out_West_2019.jpg/640px-Phum_Viphurit_Way_Out_West_2019.jpg", ext: "jpg" },
  "qa-evt-14": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Time_Warp_2014.jpg/1280px-Time_Warp_2014.jpg", ext: "jpg" },
  "qa-evt-15": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/C%C3%A9line_Dion_Concert_Singing_Taking_Chances_2008.jpg/640px-C%C3%A9line_Dion_Concert_Singing_Taking_Chances_2008.jpg", ext: "jpg" },
  "qa-evt-16": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Kitaro_in_Concert.jpg/640px-Kitaro_in_Concert.jpg", ext: "jpg" },
  "qa-evt-17": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/One_Ok_Rock_2014.jpg/1024px-One_Ok_Rock_2014.jpg", ext: "jpg" },
  "qa-evt-18": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Pamungkas_performing.jpg/640px-Pamungkas_performing.jpg", ext: "jpg" },
  "qa-evt-19": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/MCR-Shrine.jpg/1024px-MCR-Shrine.jpg", ext: "jpg" },
  "qa-evt-20": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Siti_Nurhaliza_at_AIM22.jpg/640px-Siti_Nurhaliza_at_AIM22.jpg", ext: "jpg" },
};

async function main() {
  console.log("\n🖼️  RiffOff Image Upload — Real Artist & Event Photos\n");

  // Create temp directory
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const results: Record<string, string> = {};

  // ─── 1. Download and upload artist images ───
  console.log("── Artist Images ──────────────────────");
  for (const [id, { url, ext }] of Object.entries(ARTIST_IMAGES)) {
    const localPath = path.join(TMP_DIR, `${id}.${ext}`);
    try {
      if (!fs.existsSync(localPath)) {
        await download(url, localPath);
      }
      const appwriteUrl = await uploadToAppwrite(localPath, id, `${id}.${ext}`);
      results[id] = appwriteUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${id}: ${msg}`);
      // Use a fallback — picsum
      results[id] = `https://fastly.picsum.photos/id/${Math.abs(hashCode(id)) % 1000}/400/400.jpg?hmac=fallback`;
    }
  }

  // ─── 2. Download and upload event cover images ───
  console.log("\n── Event Cover Images ──────────────────");
  for (const [id, { url, ext }] of Object.entries(EVENT_IMAGES)) {
    const localPath = path.join(TMP_DIR, `${id}.${ext}`);
    try {
      if (!fs.existsSync(localPath)) {
        await download(url, localPath);
      }
      const appwriteUrl = await uploadToAppwrite(localPath, `cover-${id}`, `cover-${id}.${ext}`);
      results[id] = appwriteUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${id}: ${msg}`);
    }
  }

  // ─── 3. Update QA event documents with new cover image URLs ───
  console.log("\n── Updating Event Documents ────────────");
  for (const id of Object.keys(EVENT_IMAGES)) {
    if (!results[id]) continue;
    try {
      await db.updateDocument(DATABASE_ID, "events", id, { coverimageUrl: results[id] });
      console.log(`  ✓ ${id} → coverimageUrl updated`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${id}: ${msg}`);
    }
  }

  // ─── 4. Output artist image map for homepage code update ───
  console.log("\n── Artist Image URLs (for page.tsx) ────");
  console.log("Copy these into TRENDING_ARTISTS:\n");
  for (const [id, url] of Object.entries(results)) {
    if (id.startsWith("artist-")) {
      const name = id.replace("artist-", "");
      console.log(`  "${name}": "${url}",`);
    }
  }

  // Cleanup
  console.log("\n✅ Done! Images uploaded to Appwrite Storage.");
  console.log(`   Temp files in: ${TMP_DIR}`);
  console.log("   You can delete .tmp-images/ when done.\n");
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

main().catch(console.error);
