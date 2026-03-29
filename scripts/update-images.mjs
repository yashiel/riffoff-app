/**
 * Replace generic event images with real artist/event images.
 * Run: node scripts/update-images.mjs
 */
import { Client, Databases, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const KEY = process.env.NEXT_APPWRITE_KEY;

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(KEY);
const db = new Databases(client);
const storage = new Storage(client);

const BUCKET = "event-media";

// Map: eventId → { imageUrl, fileName }
// Only events that need better images (small/generic ones)
const IMAGE_UPDATES = [
  { eventId: "evt-seventeen-kl", url: "https://www.allkpop.com/upload/2024/10/content/021208/web_data/allkpop_1727886168_header-photo.jpg", name: "seventeen-right-here.jpg" },
  { eventId: "evt-seventeen-sg", url: "https://www.allkpop.com/upload/2024/10/content/021208/web_data/allkpop_1727886168_header-photo.jpg", name: "seventeen-right-here-sg.jpg" },
  { eventId: "evt-aespa-kl", url: "https://www.kiacenter.com/assets/img/Static_TM-ArtistImage_2426x1365_Aespa_2025_National_V2-eb823d4c13.jpg", name: "aespa-synk.jpg" },
  { eventId: "evt-ive-kl", url: "https://www.allkpop.com/upload/2023/09/content/202252/web_data/allkpop_1695265035_20230920-ive.jpg", name: "ive-show.jpg" },
  { eventId: "evt-ive-sg", url: "https://www.allkpop.com/upload/2023/09/content/202252/web_data/allkpop_1695265035_20230920-ive.jpg", name: "ive-show-sg.jpg" },
  { eventId: "evt-txt-kl", url: "https://www.allkpop.com/upload/2025/06/content/200222/1750400559-20250619-txt.jpeg", name: "txt-act-tomorrow.jpg" },
  { eventId: "evt-ateez-kl", url: "https://www.allkpop.com/upload/2025/03/content/311303/web_data/allkpop_1743440738_img-7152.jpeg", name: "ateez-fantasy.jpg" },
  { eventId: "evt-ateez-bkk", url: "https://www.allkpop.com/upload/2025/03/content/311303/web_data/allkpop_1743440738_img-7152.jpeg", name: "ateez-fantasy-bkk.jpg" },
  { eventId: "evt-ateez-manila", url: "https://www.allkpop.com/upload/2025/03/content/311303/web_data/allkpop_1743440738_img-7152.jpeg", name: "ateez-fantasy-manila.jpg" },
  { eventId: "evt-treasure-kl", url: "https://www.allkpop.com/upload/2025/08/content/250229/web_data/allkpop_1756103487_-2025-08-25-3.png", name: "treasure-pulse-on.png" },
  { eventId: "evt-exo-kl", url: "https://www.allkpop.com/upload/2026/01/content/280910/web_data/allkpop_1769609870_img-9219.jpeg", name: "exo-exhorizon.jpg" },
  { eventId: "evt-day6-sg", url: "https://www.allkpop.com/upload/2025/08/content/050941/web_data/allkpop_1754401334_day6-concert-the-decade-resized-1200.jpg", name: "day6-decade.jpg" },
  { eventId: "evt-mcr-kl", url: "https://consequence.net/wp-content/uploads/2025/09/My-Chemical-Romance.jpg?quality=80&w=1031&h=580&crop=1", name: "mcr-parade.jpg" },
  { eventId: "evt-mcr-sg", url: "https://consequence.net/wp-content/uploads/2025/09/My-Chemical-Romance.jpg?quality=80&w=1031&h=580&crop=1", name: "mcr-parade-sg.jpg" },
  { eventId: "evt-mcr-bkk", url: "https://consequence.net/wp-content/uploads/2025/09/My-Chemical-Romance.jpg?quality=80&w=1031&h=580&crop=1", name: "mcr-parade-bkk.jpg" },
  { eventId: "evt-mcr-manila", url: "https://consequence.net/wp-content/uploads/2025/09/My-Chemical-Romance.jpg?quality=80&w=1031&h=580&crop=1", name: "mcr-parade-manila.jpg" },
  { eventId: "evt-bryan-adams-kl", url: "https://s3.amazonaws.com/syndication.abcaudio.com/files/2026-03-23/M_BryanAdamstouradmat_032326_0.png", name: "bryan-adams.png" },
  { eventId: "evt-neyo-colombo", url: "https://www.aceshowbiz.com/images/photo/ne_yo.jpg", name: "neyo.jpg" },
  { eventId: "evt-yuna-homecoming", url: "https://cdn.i-scmp.com/sites/default/files/d8/images/methode/2019/07/18/813d35c6-a915-11e9-862b-600d112f3b14_image_hires_154154.jpg", name: "yuna-zarai.jpg" },
  { eventId: "evt-masdo-penang", url: "https://graziamy.s3.ap-southeast-1.amazonaws.com/wp-content/uploads/2024/03/1-4.jpg", name: "masdo.jpg" },
  { eventId: "evt-yohani-live-colombo", url: "https://resize.indiatvnews.com/en/resize/newbucket/1200_-/2021/09/yohani-1632936586.jpg", name: "yohani.jpg" },
  { eventId: "evt-sheila-anniversary", url: "https://seasia.co/img/articles/2025/04/21/nostalgia-with-sheila-majid-the-malaysias-jazz-queen-7z4aA2oLCY.jpg?p=articles-lg", name: "sheila-majid.jpg" },
  { eventId: "evt-swara-colombo", url: "https://www.proavl-asia.com/img/wdwgxrdcdcn74mrgs6pwmznw.jpeg", name: "swara-concert.jpg" },
  { eventId: "evt-underground-colombo", url: "https://edmhousenetwork.com/wp-content/uploads/2024/06/verknipt-1200x675.jpg", name: "techno-underground.jpg" },
  { eventId: "evt-kl-jazz-free", url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&h=675&fit=crop", name: "jazz-park.jpg" },
  { eventId: "evt-colombo-music-fest", url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&h=675&fit=crop", name: "colombo-fest.jpg" },
  { eventId: "evt-bns-reunion", url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=675&fit=crop", name: "bns-concert.jpg" },
  { eventId: "evt-we-the-fest-2026", url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&h=675&fit=crop", name: "wtf-festival.jpg" },
  { eventId: "evt-rwmf-2026", url: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&h=675&fit=crop", name: "rwmf-stage.jpg" },
];

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "Accept": "image/*",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  console.log(`Updating ${IMAGE_UPDATES.length} event images...\n`);

  let success = 0;
  let failed = 0;

  for (const { eventId, url, name } of IMAGE_UPDATES) {
    try {
      // Download
      const buffer = await downloadImage(url);
      if (buffer.length < 5000) {
        console.log(`  ⚠ ${eventId}: too small (${buffer.length}B), skipping`);
        failed++;
        continue;
      }

      // Delete old file if exists
      const oldFileId = `cover-${eventId}`;
      try { await storage.deleteFile(BUCKET, oldFileId); } catch {}

      // Upload new
      const newFileId = `cover-${eventId}`;
      await storage.createFile(BUCKET, newFileId, InputFile.fromBuffer(buffer, name));

      // Update event document
      const fileUrl = `${ENDPOINT}/storage/buckets/${BUCKET}/files/${newFileId}/view?project=${PROJECT}`;
      await db.updateDocument("riffoff", "events", eventId, { coverimageUrl: fileUrl });

      console.log(`  ✅ ${eventId}: ${name} (${Math.round(buffer.length / 1024)}KB)`);
      success++;
    } catch (e) {
      console.log(`  ❌ ${eventId}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n✅ Done: ${success} updated, ${failed} failed`);
}

main().catch(console.error);
