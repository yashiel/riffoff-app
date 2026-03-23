/**
 * RiffOff Image Seed Script
 *
 * Downloads genre-appropriate images from Unsplash and uploads them
 * to Appwrite Storage as event covers. Then updates each event document.
 *
 * Usage: npx tsx scripts/seed-images.ts
 *
 * Note: Uses royalty-free Unsplash images to avoid copyright issues.
 * In production, organisers upload their own event artwork.
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

// Map event IDs to Unsplash search terms for genre-appropriate images
const EVENT_IMAGE_QUERIES: Record<string, string> = {
  // K-Pop events — concert/stage/neon vibes
  "evt-blackpink-kl": "kpop concert stage pink lights",
  "evt-stray-kids-kl": "concert stage crowd energy",
  "evt-seventeen-kl": "kpop performance stage lights",
  "evt-aespa-kl": "futuristic concert neon purple",
  "evt-ive-kl": "concert stage pink spotlight",
  // Festivals
  "evt-good-vibes-2026": "outdoor music festival crowd sunset",
  "evt-rwmf-2026": "world music festival tropical rainforest",
  // Concerts
  "evt-yuna-homecoming": "intimate concert acoustic warm light",
  "evt-sheila-anniversary": "jazz concert saxophone stage",
  "evt-edm-night-kl": "dj electronic music neon club",
  // Sri Lanka
  "evt-yohani-live-colombo": "concert stage warm lights singer",
  "evt-bns-reunion": "rock band concert stage",
  "evt-colombo-music-fest": "outdoor music festival beach sunset",
  "evt-underground-colombo": "dark techno club underground",
  // Singapore
  "evt-twice-sg": "kpop stadium concert lights",
  "evt-zoukout-2026": "beach party dj night festival",
  // Thailand
  "evt-bts-bangkok": "massive stadium concert fireworks",
  "evt-808-festival": "edm festival bass stage lasers",
  // Indonesia
  "evt-we-the-fest-2026": "indie music festival colorful crowd",
  // Malaysia additional
  "evt-masdo-penang": "indie rock concert small venue",
  "evt-kl-jazz-free": "outdoor jazz concert park evening",
};

// Curated Unsplash photo IDs for concert/music/festival imagery
// These are specific, high-quality, royalty-free photos
const UNSPLASH_PHOTOS: Record<string, string> = {
  "evt-blackpink-kl": "hzgs56Ze49s", // concert stage pink lights
  "evt-stray-kids-kl": "JmBNAI_3XHg", // concert crowd energy
  "evt-seventeen-kl": "yeB9jDmHm6M", // kpop stage lights
  "evt-aespa-kl": "Kn3PVopBYFc", // neon purple concert
  "evt-ive-kl": "iThKOL3DQJY", // pink spotlight stage
  "evt-good-vibes-2026": "hPKTYwJ4FUo", // outdoor festival sunset
  "evt-rwmf-2026": "1HCb2gPk3ik", // tropical music
  "evt-yuna-homecoming": "CnMHlifRvKE", // intimate acoustic
  "evt-sheila-anniversary": "PDX_a_82obo", // jazz stage
  "evt-edm-night-kl": "3Uf-aRahKcc", // dj neon
  "evt-yohani-live-colombo": "mluSdDeOksc", // singer concert
  "evt-bns-reunion": "VaMBa7-bJgQ", // rock concert
  "evt-colombo-music-fest": "Nainoa Shizuru", // beach festival
  "evt-underground-colombo": "xnOmPNl6DPQ", // dark club
  "evt-twice-sg": "QRkew0KwXSM", // stadium lights
  "evt-zoukout-2026": "OBVjnIQz5N0", // beach party
  "evt-bts-bangkok": "NYrVisodQ2M", // massive stadium
  "evt-808-festival": "NTjSR3zYpsY", // edm lasers
  "evt-we-the-fest-2026": "-HPhkZcJQNk", // colorful festival
  "evt-masdo-penang": "QkvAVNFxPOI", // small venue
  "evt-kl-jazz-free": "aWslrFhs1w4", // outdoor jazz
};

async function downloadImage(eventId: string): Promise<Buffer | null> {
  const photoId = UNSPLASH_PHOTOS[eventId];
  if (!photoId) return null;

  // Use Unsplash direct photo URL (works without API key)
  const url = `https://images.unsplash.com/photo-${photoId}?w=800&h=600&fit=crop&crop=faces,center&auto=format&q=80`;

  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "RiffOff-Seed/1.0" },
    });
    if (!response.ok) {
      // Fallback to picsum.photos (always works)
      const fallbackUrl = `https://picsum.photos/seed/${eventId}/800/600`;
      const fallback = await fetch(fallbackUrl, { redirect: "follow" });
      if (!fallback.ok) throw new Error(`HTTP ${fallback.status}`);
      const buf = await fallback.arrayBuffer();
      return Buffer.from(buf);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    // Final fallback: picsum
    try {
      const fallbackUrl = `https://picsum.photos/seed/${eventId}/800/600`;
      const fallback = await fetch(fallbackUrl, { redirect: "follow" });
      const buf = await fallback.arrayBuffer();
      return Buffer.from(buf);
    } catch {
      console.error(`  ✗ All image sources failed for ${eventId}`);
      return null;
    }
  }
}

async function seed() {
  console.log("\n🖼️  RiffOff Image Seed\n");

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT!;

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const [eventId, query] of Object.entries(EVENT_IMAGE_QUERIES)) {
    // Check if event already has a cover image
    try {
      const event = await databases.getDocument(DATABASE_ID, "events", eventId);
      if (event.coverimageUrl) {
        console.log(`  ⊘ ${eventId}: already has cover — skipping`);
        skipped++;
        continue;
      }
    } catch {
      console.error(`  ✗ ${eventId}: event not found — skipping`);
      failed++;
      continue;
    }

    // Download image
    const query = EVENT_IMAGE_QUERIES[eventId];
    console.log(`  ↓ ${eventId}: downloading "${query}"...`);
    const imageBuffer = await downloadImage(eventId);
    if (!imageBuffer) {
      failed++;
      continue;
    }

    // Upload to Appwrite Storage
    try {
      const fileId = `cover-${eventId}`;
      const file = await storage.createFile(
        BUCKET_ID,
        fileId,
        InputFile.fromBuffer(imageBuffer, `${eventId}.jpg`),
      );

      const coverUrl = `${endpoint}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=${projectId}`;

      // Update event document
      await databases.updateDocument(DATABASE_ID, "events", eventId, {
        coverimageUrl: coverUrl,
      });

      console.log(`  ✓ ${eventId}: uploaded and linked`);
      uploaded++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("already exists")) {
        // File exists — just link it
        const coverUrl = `${endpoint}/storage/buckets/${BUCKET_ID}/files/cover-${eventId}/view?project=${projectId}`;
        await databases.updateDocument(DATABASE_ID, "events", eventId, {
          coverimageUrl: coverUrl,
        }).catch(() => {});
        console.log(`  ⊘ ${eventId}: file exists — linked`);
        skipped++;
      } else {
        console.error(`  ✗ ${eventId}: upload failed — ${message}`);
        failed++;
      }
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n✅ Image seed complete!`);
  console.log(`  ${uploaded} uploaded, ${skipped} skipped, ${failed} failed\n`);
}

seed().catch((err) => {
  console.error("Image seed failed:", err);
  process.exit(1);
});
