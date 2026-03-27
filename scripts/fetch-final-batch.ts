import { Client, Storage, Databases } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as https from "https";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const BUCKET_ID = "event-media";
const DATABASE_ID = "riffoff";
const TMP_DIR = path.resolve(__dirname, "../.tmp-final");

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);
const storage = new Storage(client);
const db = new Databases(client);

function fileUrl(id: string) {
  return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${id}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`;
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doGet = (u: string, rd = 0) => {
      if (rd > 5) { reject(new Error("Too many redirects")); return; }
      https.get(u, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" } }, (res) => {
        if ([301,302,307].includes(res.statusCode!)) { doGet(res.headers.location!, rd+1); return; }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
        const f = fs.createWriteStream(dest);
        res.pipe(f);
        f.on("finish", () => { f.close(); resolve(); });
        f.on("error", reject);
      }).on("error", reject);
    };
    doGet(url);
  });
}
async function tryDel(id: string) { try { await storage.deleteFile(BUCKET_ID, id); } catch {} }

const FINAL: Record<string, string> = {
  "qa-evt-01": "https://upload.wikimedia.org/wikipedia/commons/0/09/Tomorrowland_%2814702576983%29.jpg",
  "qa-evt-02": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Tomorrowland_%2814702576983%29.jpg/1280px-Tomorrowland_%2814702576983%29.jpg",
  "qa-evt-03": "https://upload.wikimedia.org/wikipedia/commons/5/5a/ZoukOut.jpg",
  "qa-evt-05": "https://upload.wikimedia.org/wikipedia/commons/2/23/One_Ok_Rock_in_Budapest%2C_D%C3%BCrer_Kert%2C_2019-05-19.jpg",
  "qa-evt-06": "https://upload.wikimedia.org/wikipedia/commons/5/52/The_landmark_Nelum_Pokuna_%28Lotus_Pond%29_Mahinda_Rajapaksa_Theatre.JPG",
  "qa-evt-08": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Tomorrowland_%2814702576983%29.jpg/1280px-Tomorrowland_%2814702576983%29.jpg",
  "qa-evt-10": "https://upload.wikimedia.org/wikipedia/commons/6/61/Yo-Yo_Ma_in_2018_%28cropped%29.jpg",
  "qa-evt-14": "https://upload.wikimedia.org/wikipedia/commons/c/cc/BryAdamsMargate130624_%2839_of_43%29_%2853789411882%29_Cropped.jpg",
  "qa-evt-19": "https://upload.wikimedia.org/wikipedia/commons/3/3f/ATEEZ_in_August_2024_%28cropped%29.jpg",
};

async function main() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
  const entries = Object.entries(FINAL);
  console.log(`\n🎵 Final batch: ${entries.length} images with 5s delays...\n`);
  for (let i = 0; i < entries.length; i++) {
    const [id, url] = entries[i];
    const ext = url.includes(".png") ? ".png" : ".jpg";
    const lp = path.join(TMP_DIR, `${id}${ext}`);
    try {
      process.stdout.write(`  [${i+1}/${entries.length}] ⬇ ${id}...`);
      await download(url, lp);
      const s = fs.statSync(lp);
      if (s.size < 3000) { console.log(` ❌ too small`); continue; }
      await tryDel(id);
      await storage.createFile(BUCKET_ID, id, InputFile.fromPath(lp, `${id}${ext}`));
      await db.updateDocument(DATABASE_ID, "events", id, { coverimageUrl: fileUrl(id) });
      console.log(` ✅ (${Math.round(s.size/1024)}KB)`);
    } catch (e: any) { console.log(` ❌ ${e.message?.slice(0,80)}`); }
    if (i < entries.length - 1) await sleep(5000);
  }
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  console.log("\n✅ All done!");
}
main().catch(console.error);
