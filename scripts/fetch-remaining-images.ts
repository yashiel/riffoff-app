/**
 * Retry fetching remaining images with delays to avoid rate limiting.
 * Usage: cd src/musicticketing && npx tsx scripts/fetch-remaining-images.ts
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
const EVENTS_COLLECTION = "events";
const TMP_DIR = path.resolve(__dirname, "../.tmp-real-images-2");

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
    const doGet = (u: string, redirects = 0) => {
      if (redirects > 5) { reject(new Error("Too many redirects")); return; }
      https.get(u, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          doGet(res.headers.location!, redirects + 1); return;
        }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
        file.on("error", reject);
      }).on("error", reject);
    };
    doGet(url);
  });
}

async function tryDelete(fileId: string) {
  try { await storage.deleteFile(BUCKET_ID, fileId); } catch { /* ignore */ }
}

// Only the ones that failed (429)
const REMAINING: Record<string, { url: string; isEvent: boolean }> = {
  "artist-ive": { url: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Ive_at_the_40th_Golden_Disc_Awards%2C_January_10%2C_2026_%282%29.png", isEvent: false },
  "artist-txt": { url: "https://upload.wikimedia.org/wikipedia/commons/a/a8/Tomorrow_X_Together_at_a_Dior_event%2C_April_18%2C_2025.png", isEvent: false },
  "artist-yohani": { url: "https://upload.wikimedia.org/wikipedia/commons/c/c2/Yohani_D_Silva.jpg", isEvent: false },
  "qa-evt-01": { url: "https://upload.wikimedia.org/wikipedia/commons/0/09/Tomorrowland_%2814702576983%29.jpg", isEvent: true },
  "qa-evt-02": { url: "https://upload.wikimedia.org/wikipedia/commons/0/09/Tomorrowland_%2814702576983%29.jpg", isEvent: true },
  "qa-evt-03": { url: "https://upload.wikimedia.org/wikipedia/commons/5/5a/ZoukOut.jpg", isEvent: true },
  "qa-evt-04": { url: "https://upload.wikimedia.org/wikipedia/commons/8/87/MY_TAM_-_LIGHT_%26_SHADOW_LIVE_-_INAX_VIETNAM.jpg", isEvent: true },
  "qa-evt-05": { url: "https://upload.wikimedia.org/wikipedia/commons/2/23/One_Ok_Rock_in_Budapest%2C_D%C3%BCrer_Kert%2C_2019-05-19.jpg", isEvent: true },
  "qa-evt-06": { url: "https://upload.wikimedia.org/wikipedia/commons/5/52/The_landmark_Nelum_Pokuna_%28Lotus_Pond%29_Mahinda_Rajapaksa_Theatre.JPG", isEvent: true },
  "qa-evt-07": { url: "https://upload.wikimedia.org/wikipedia/commons/9/93/Siti_Nurhaliza_at_Siti_Nurhaliza%27s_30th_Anniversary_Event_03_%28cropped%29.jpg", isEvent: true },
  "qa-evt-08": { url: "https://upload.wikimedia.org/wikipedia/commons/0/09/Tomorrowland_%2814702576983%29.jpg", isEvent: true },
  "qa-evt-09": { url: "https://upload.wikimedia.org/wikipedia/commons/7/73/BTS_during_a_White_House_press_conference_May_31%2C_2022_%28cropped%29.jpg", isEvent: true },
  "qa-evt-10": { url: "https://upload.wikimedia.org/wikipedia/commons/6/61/Yo-Yo_Ma_in_2018_%28cropped%29.jpg", isEvent: true },
  "qa-evt-11": { url: "https://upload.wikimedia.org/wikipedia/commons/f/f5/C%C3%A9line_Dion_2012.jpg", isEvent: true },
  "qa-evt-12": { url: "https://upload.wikimedia.org/wikipedia/commons/7/73/BTS_during_a_White_House_press_conference_May_31%2C_2022_%28cropped%29.jpg", isEvent: true },
  "qa-evt-13": { url: "https://upload.wikimedia.org/wikipedia/commons/c/c2/Yohani_D_Silva.jpg", isEvent: true },
  "qa-evt-14": { url: "https://upload.wikimedia.org/wikipedia/commons/c/cc/BryAdamsMargate130624_%2839_of_43%29_%2853789411882%29_Cropped.jpg", isEvent: true },
  "qa-evt-15": { url: "https://upload.wikimedia.org/wikipedia/commons/1/18/Yuna_-_Bandung_2016_%28cropped%29.jpg", isEvent: true },
  "qa-evt-16": { url: "https://upload.wikimedia.org/wikipedia/commons/3/3a/SB19_at_the_Billboard_K_Power_100%2C_August_27_2024.jpg", isEvent: true },
  "qa-evt-18": { url: "https://upload.wikimedia.org/wikipedia/commons/0/05/240405_%ED%8A%B8%EB%A0%88%EC%A0%80_TTA_Malaysia_1st_Place.jpg", isEvent: true },
  "qa-evt-19": { url: "https://upload.wikimedia.org/wikipedia/commons/3/3f/ATEEZ_in_August_2024_%28cropped%29.jpg", isEvent: true },
  "qa-evt-20": { url: "https://upload.wikimedia.org/wikipedia/commons/9/93/Siti_Nurhaliza_at_Siti_Nurhaliza%27s_30th_Anniversary_Event_03_%28cropped%29.jpg", isEvent: true },
};

async function main() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const entries = Object.entries(REMAINING);
  console.log(`\n🎵 Retrying ${entries.length} images with 3s delays...\n`);

  for (let i = 0; i < entries.length; i++) {
    const [fileId, { url, isEvent }] = entries[i];
    const ext = url.includes(".png") ? ".png" : ".jpg";
    const localPath = path.join(TMP_DIR, `${fileId}${ext}`);

    try {
      process.stdout.write(`  [${i + 1}/${entries.length}] ⬇ ${fileId}...`);
      await download(url, localPath);

      const stats = fs.statSync(localPath);
      if (stats.size < 3000) {
        console.log(` ❌ too small (${stats.size}b)`);
        continue;
      }

      await tryDelete(fileId);
      await storage.createFile(BUCKET_ID, fileId, InputFile.fromPath(localPath, `${fileId}${ext}`));

      if (isEvent) {
        await db.updateDocument(DATABASE_ID, EVENTS_COLLECTION, fileId, {
          coverimageUrl: fileUrl(fileId),
        });
      }

      console.log(` ✅ (${Math.round(stats.size / 1024)}KB)`);
    } catch (err: any) {
      console.log(` ❌ ${err.message?.slice(0, 80)}`);
    }

    // Wait 3 seconds between each to avoid rate limiting
    if (i < entries.length - 1) {
      await sleep(3000);
    }
  }

  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  console.log("\n✅ Done!");
}

main().catch(console.error);
