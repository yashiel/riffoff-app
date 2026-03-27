/**
 * Download real artist/event photos from Wikimedia Commons and upload to Appwrite Storage.
 * Then update event documents with the new cover image URLs.
 *
 * Usage: cd src/musicticketing && npx tsx scripts/fetch-real-images.ts
 */
import { Client, Storage, Databases, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as https from "https";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const BUCKET_ID = "event-media";
const DATABASE_ID = "riffoff";
const EVENTS_COLLECTION = "events";
const TMP_DIR = path.resolve(__dirname, "../.tmp-real-images");

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);

const storage = new Storage(client);
const db = new Databases(client);

function fileUrl(fileId: string): string {
  return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`;
}

// Download with redirect following
function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doGet = (u: string, redirects = 0) => {
      if (redirects > 5) { reject(new Error("Too many redirects")); return; }
      https.get(u, { headers: { "User-Agent": "Mozilla/5.0 (compatible; RiffOff/1.0)" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          doGet(res.headers.location!, redirects + 1);
          return;
        }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} for ${u}`)); return; }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
        file.on("error", reject);
      }).on("error", reject);
    };
    doGet(url);
  });
}

// Try to delete existing file, ignore if not found
async function tryDelete(fileId: string) {
  try { await storage.deleteFile(BUCKET_ID, fileId); } catch { /* ignore */ }
}

// ─── Artist images ───
const ARTIST_IMAGES: Record<string, string> = {
  "artist-bts": "https://upload.wikimedia.org/wikipedia/commons/7/73/BTS_during_a_White_House_press_conference_May_31%2C_2022_%28cropped%29.jpg",
  "artist-ateez": "https://upload.wikimedia.org/wikipedia/commons/3/3f/ATEEZ_in_August_2024_%28cropped%29.jpg",
  "artist-mcr": "https://upload.wikimedia.org/wikipedia/commons/e/e1/MCR820_%28cropped%29.jpg",
  "artist-ive": "https://upload.wikimedia.org/wikipedia/commons/e/ef/Ive_at_the_40th_Golden_Disc_Awards%2C_January_10%2C_2026_%282%29.png",
  "artist-seventeen": "https://upload.wikimedia.org/wikipedia/commons/8/8b/Seventeen_Carat_Land_24.jpg",
  "artist-txt": "https://upload.wikimedia.org/wikipedia/commons/a/a8/Tomorrow_X_Together_at_a_Dior_event%2C_April_18%2C_2025.png",
  "artist-day6": "https://upload.wikimedia.org/wikipedia/commons/a/ac/180628_Day6.jpg",
  "artist-treasure": "https://upload.wikimedia.org/wikipedia/commons/0/05/240405_%ED%8A%B8%EB%A0%88%EC%A0%80_TTA_Malaysia_1st_Place.jpg",
  "artist-exo": "https://upload.wikimedia.org/wikipedia/commons/9/91/Exo_monster_160618_suwon.png",
  "artist-yohani": "https://upload.wikimedia.org/wikipedia/commons/c/c2/Yohani_D_Silva.jpg",
  "artist-bryan": "https://upload.wikimedia.org/wikipedia/commons/c/cc/BryAdamsMargate130624_%2839_of_43%29_%2853789411882%29_Cropped.jpg",
  "artist-yuna": "https://upload.wikimedia.org/wikipedia/commons/1/18/Yuna_-_Bandung_2016_%28cropped%29.jpg",
};

// ─── Event cover images — mapped by qa-evt ID to artist/venue Wikipedia image ───
const EVENT_IMAGES: Record<string, string> = {
  // qa-evt-01: 808 Festival Bangkok (EDM) → Tomorrowland crowd
  "qa-evt-01": "https://upload.wikimedia.org/wikipedia/commons/0/09/Tomorrowland_%2814702576983%29.jpg",
  // qa-evt-02: Head in the Clouds Jakarta → generic festival crowd
  "qa-evt-02": "https://upload.wikimedia.org/wikipedia/commons/0/09/Tomorrowland_%2814702576983%29.jpg",
  // qa-evt-03: ZoukOut 2026
  "qa-evt-03": "https://upload.wikimedia.org/wikipedia/commons/5/5a/ZoukOut.jpg",
  // qa-evt-04: Mỹ Tâm concert
  "qa-evt-04": "https://upload.wikimedia.org/wikipedia/commons/8/87/MY_TAM_-_LIGHT_%26_SHADOW_LIVE_-_INAX_VIETNAM.jpg",
  // qa-evt-05: ONE OK ROCK Asia Tour
  "qa-evt-05": "https://upload.wikimedia.org/wikipedia/commons/2/23/One_Ok_Rock_in_Budapest%2C_D%C3%BCrer_Kert%2C_2019-05-19.jpg",
  // qa-evt-06: Colombo Music Festival → Nelum Pokuna venue
  "qa-evt-06": "https://upload.wikimedia.org/wikipedia/commons/5/52/The_landmark_Nelum_Pokuna_%28Lotus_Pond%29_Mahinda_Rajapaksa_Theatre.JPG",
  // qa-evt-07: Siti Nurhaliza Royal Concert
  "qa-evt-07": "https://upload.wikimedia.org/wikipedia/commons/9/93/Siti_Nurhaliza_at_Siti_Nurhaliza%27s_30th_Anniversary_Event_03_%28cropped%29.jpg",
  // qa-evt-08: Midnight Frequency techno → EDM crowd
  "qa-evt-08": "https://upload.wikimedia.org/wikipedia/commons/0/09/Tomorrowland_%2814702576983%29.jpg",
  // qa-evt-09: BTS FOREVER Bangkok
  "qa-evt-09": "https://upload.wikimedia.org/wikipedia/commons/7/73/BTS_during_a_White_House_press_conference_May_31%2C_2022_%28cropped%29.jpg",
  // qa-evt-10: Yo-Yo Ma Solo Recital
  "qa-evt-10": "https://upload.wikimedia.org/wikipedia/commons/6/61/Yo-Yo_Ma_in_2018_%28cropped%29.jpg",
  // qa-evt-11: Celine Dion Tour
  "qa-evt-11": "https://upload.wikimedia.org/wikipedia/commons/f/f5/C%C3%A9line_Dion_2012.jpg",
  // qa-evt-12: BTS ARIRANG World Tour Singapore
  "qa-evt-12": "https://upload.wikimedia.org/wikipedia/commons/7/73/BTS_during_a_White_House_press_conference_May_31%2C_2022_%28cropped%29.jpg",
  // qa-evt-13: Yohani Live Colombo
  "qa-evt-13": "https://upload.wikimedia.org/wikipedia/commons/c/c2/Yohani_D_Silva.jpg",
  // qa-evt-14: Bryan Adams KL
  "qa-evt-14": "https://upload.wikimedia.org/wikipedia/commons/c/cc/BryAdamsMargate130624_%2839_of_43%29_%2853789411882%29_Cropped.jpg",
  // qa-evt-15: Yuna Homecoming
  "qa-evt-15": "https://upload.wikimedia.org/wikipedia/commons/1/18/Yuna_-_Bandung_2016_%28cropped%29.jpg",
  // qa-evt-16: SB19 Manila
  "qa-evt-16": "https://upload.wikimedia.org/wikipedia/commons/3/3a/SB19_at_the_Billboard_K_Power_100%2C_August_27_2024.jpg",
  // qa-evt-17: EXO Planet KL
  "qa-evt-17": "https://upload.wikimedia.org/wikipedia/commons/9/91/Exo_monster_160618_suwon.png",
  // qa-evt-18: TREASURE KL
  "qa-evt-18": "https://upload.wikimedia.org/wikipedia/commons/0/05/240405_%ED%8A%B8%EB%A0%88%EC%A0%80_TTA_Malaysia_1st_Place.jpg",
  // qa-evt-19: ATEEZ World Tour KL
  "qa-evt-19": "https://upload.wikimedia.org/wikipedia/commons/3/3f/ATEEZ_in_August_2024_%28cropped%29.jpg",
  // qa-evt-20: Dato' Sri Siti & Raihan Hari Raya
  "qa-evt-20": "https://upload.wikimedia.org/wikipedia/commons/9/93/Siti_Nurhaliza_at_Siti_Nurhaliza%27s_30th_Anniversary_Event_03_%28cropped%29.jpg",
};

async function main() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const allImages = { ...ARTIST_IMAGES, ...EVENT_IMAGES };
  const results: Record<string, string> = {};

  console.log(`\n🎵 Downloading and uploading ${Object.keys(allImages).length} real images...\n`);

  for (const [fileId, url] of Object.entries(allImages)) {
    // Skip duplicates (same URL already processed)
    const existingEntry = Object.entries(results).find(([, u]) => u === fileUrl(fileId));

    const ext = url.includes(".png") ? ".png" : ".jpg";
    const localPath = path.join(TMP_DIR, `${fileId}${ext}`);

    try {
      // Download
      process.stdout.write(`  ⬇ ${fileId}...`);
      await download(url, localPath);

      const stats = fs.statSync(localPath);
      if (stats.size < 5000) {
        console.log(` ❌ too small (${stats.size}b), skipping`);
        continue;
      }

      // Delete existing file in Appwrite
      await tryDelete(fileId);

      // Upload
      const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
      await storage.createFile(
        BUCKET_ID,
        fileId,
        InputFile.fromPath(localPath, `${fileId}${ext}`),
      );

      const resultUrl = fileUrl(fileId);
      results[fileId] = resultUrl;
      console.log(` ✅ (${Math.round(stats.size / 1024)}KB)`);
    } catch (err: any) {
      console.log(` ❌ ${err.message?.slice(0, 80)}`);
    }
  }

  // ─── Update event documents with new cover images ───
  console.log("\n📝 Updating event documents...\n");

  for (const [evtId, _] of Object.entries(EVENT_IMAGES)) {
    const newUrl = results[evtId];
    if (!newUrl) continue;

    try {
      await db.updateDocument(DATABASE_ID, EVENTS_COLLECTION, evtId, {
        coverimageUrl: newUrl,
      });
      console.log(`  ✅ ${evtId} → cover image updated`);
    } catch (err: any) {
      console.log(`  ❌ ${evtId}: ${err.message?.slice(0, 60)}`);
    }
  }

  // Cleanup
  fs.rmSync(TMP_DIR, { recursive: true, force: true });

  console.log(`\n✅ Done! ${Object.keys(results).length} images uploaded.`);
  console.log("\nArtist image file IDs for homepage TRENDING_ARTISTS:");
  for (const [id, url] of Object.entries(results)) {
    if (id.startsWith("artist-")) {
      console.log(`  ${id}: "${url}"`);
    }
  }
}

main().catch(console.error);
