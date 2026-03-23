/**
 * RiffOff Real Image Seed
 *
 * Downloads real event posters and artist promotional images,
 * uploads to Appwrite Storage, and links to event documents.
 *
 * Usage: npx tsx scripts/seed-real-images.ts
 */

import { Client, Databases, Storage, ID, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const DATABASE_ID = "riffoff";
const BUCKET_ID = "event-media";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);

const databases = new Databases(client);
const storage = new Storage(client);

// Real image URLs — event posters and artist promo photos
const EVENT_IMAGES: Record<string, { url: string; referer?: string }> = {
  // K-Pop Malaysia
  "evt-blackpink-kl": {
    url: "https://www.allkpop.com/upload/2022/08/content/181052/1660833154-blackpink-born-pink.jpg",
  },
  "evt-stray-kids-kl": {
    url: "https://www.allkpop.com/upload/2024/11/content/181259/web_data/allkpop_1731957183_header-photo.jpg",
  },
  "evt-seventeen-kl": {
    url: "https://www.allkpop.com/upload/2024/10/content/021222/1727886162-header-photo.jpg",
  },
  "evt-aespa-kl": {
    url: "https://www.allkpop.com/upload/2024/09/content/262235/1727404510-20240926-aespa.jpg",
  },
  "evt-ive-kl": {
    url: "https://www.allkpop.com/upload/2023/09/content/202257/1695265031-20230920-ive.jpg",
  },
  // Festivals
  "evt-good-vibes-2026": {
    url: "https://storage.googleapis.com/buro-malaysia-storage/www.buro247.my/2024/05/a7501c6b-in-text-good-vibes-festival-2024.jpg",
  },
  "evt-rwmf-2026": {
    url: "https://rwmf.net/wp-content/uploads/2026/03/2026-03-13-press-1-768x454.jpeg",
    referer: "https://rwmf.net/",
  },
  // Concerts
  "evt-yuna-homecoming": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Yuna_2019_%28cropped%29.jpg/440px-Yuna_2019_%28cropped%29.jpg",
  },
  "evt-sheila-anniversary": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Sheila_Majid_2007.jpg/440px-Sheila_Majid_2007.jpg",
  },
  "evt-edm-night-kl": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Martin_Garrix_2016.jpg/440px-Martin_Garrix_2016.jpg",
  },
  // Sri Lanka
  "evt-yohani-live-colombo": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Yohani_%28cropped%29.jpg/440px-Yohani_%28cropped%29.jpg",
  },
  "evt-bns-reunion": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Bathiya_and_Santhush.jpg/440px-Bathiya_and_Santhush.jpg",
  },
  "evt-colombo-music-fest": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Galle_Face_Green_-_Colombo.jpg/640px-Galle_Face_Green_-_Colombo.jpg",
  },
  "evt-underground-colombo": {
    url: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&h=600&fit=crop",
  },
  // Singapore
  "evt-twice-sg": {
    url: "https://thumb.mtstarnews.com/star_chi/06/2023/02/2023022216186920304_1.jpg",
    referer: "https://www.mtstarnews.com/",
  },
  "evt-zoukout-2026": {
    url: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&h=600&fit=crop",
  },
  // Thailand
  "evt-bts-bangkok": {
    url: "https://www.allkpop.com/upload/2022/09/content/250124/1664083442-image.png",
  },
  "evt-808-festival": {
    url: "https://weraveyou.com/wp-content/uploads/2024/11/808-Festival-2023-scaled.jpg",
    referer: "https://weraveyou.com/",
  },
  // Indonesia
  "evt-we-the-fest-2026": {
    url: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&h=600&fit=crop",
  },
  // Malaysia additional
  "evt-masdo-penang": {
    url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&h=600&fit=crop",
  },
  "evt-kl-jazz-free": {
    url: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&h=600&fit=crop",
  },
};

async function downloadImage(url: string, referer?: string): Promise<Buffer | null> {
  try {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
    };
    if (referer) headers["Referer"] = referer;

    const response = await fetch(url, { headers, redirect: "follow" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("image")) {
      throw new Error(`Not an image: ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Minimum size check (skip tiny/broken images)
    if (buffer.length < 5000) {
      throw new Error(`Image too small: ${buffer.length} bytes`);
    }

    return buffer;
  } catch (err) {
    console.error(`  ✗ Download failed: ${err}`);
    return null;
  }
}

async function deleteOldImage(eventId: string) {
  const fileId = `cover-${eventId}`;
  try {
    await storage.deleteFile(BUCKET_ID, fileId);
    console.log(`  🗑 Deleted old: ${fileId}`);
  } catch {
    // File doesn't exist — that's fine
  }
}

async function seed() {
  console.log("\n🖼️  RiffOff Real Image Seed\n");

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT!;

  let uploaded = 0;
  let failed = 0;

  for (const [eventId, { url, referer }] of Object.entries(EVENT_IMAGES)) {
    // Verify event exists
    try {
      await databases.getDocument(DATABASE_ID, "events", eventId);
    } catch {
      console.log(`  ⊘ ${eventId}: event not found — skipping`);
      failed++;
      continue;
    }

    // Delete old placeholder
    await deleteOldImage(eventId);

    // Download real image
    console.log(`  ↓ ${eventId}: downloading...`);
    const imageBuffer = await downloadImage(url, referer);

    if (!imageBuffer) {
      // Fallback: use a high-quality Unsplash concert photo
      console.log(`  ↻ ${eventId}: trying fallback...`);
      const fallbackUrl = `https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&h=600&fit=crop&seed=${eventId}`;
      const fallback = await downloadImage(fallbackUrl);
      if (!fallback) {
        failed++;
        continue;
      }
    }

    const buffer = imageBuffer!;

    // Upload to Appwrite
    try {
      const fileId = `cover-${eventId}`;
      const ext = url.includes(".png") ? "png" : "jpg";
      const file = await storage.createFile(
        BUCKET_ID,
        fileId,
        InputFile.fromBuffer(buffer, `${eventId}.${ext}`),
      );

      const coverUrl = `${endpoint}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=${projectId}`;

      await databases.updateDocument(DATABASE_ID, "events", eventId, {
        coverimageUrl: coverUrl,
      });

      console.log(`  ✓ ${eventId}: uploaded (${(buffer.length / 1024).toFixed(0)}KB)`);
      uploaded++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${eventId}: ${msg}`);
      failed++;
    }

    // Rate limit protection
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n✅ Done! ${uploaded} uploaded, ${failed} failed\n`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
