/**
 * Fix missing event images — retry failed downloads with alternative sources
 */
import { Client, Databases, Storage } from "node-appwrite";
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

// Alternative URLs for events that failed
const RETRY_IMAGES: Record<string, string> = {
  "evt-blackpink-kl": "https://images.unsplash.com/photo-1619983081563-430f63602796?w=800&h=600&fit=crop",
  "evt-yuna-homecoming": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
  "evt-sheila-anniversary": "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=600&fit=crop",
  "evt-edm-night-kl": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop",
  "evt-yohani-live-colombo": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop",
  "evt-bns-reunion": "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&h=600&fit=crop",
  "evt-colombo-music-fest": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop",
  "evt-underground-colombo": "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=800&h=600&fit=crop",
};

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buf = await response.arrayBuffer();
    const buffer = Buffer.from(buf);
    if (buffer.length < 5000) throw new Error(`Too small: ${buffer.length}b`);
    return buffer;
  } catch (err) {
    console.error(`  ✗ ${err}`);
    return null;
  }
}

async function seed() {
  console.log("\n🔧 Fixing missing images...\n");
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT!;

  for (const [eventId, url] of Object.entries(RETRY_IMAGES)) {
    // Check if event already has an image
    try {
      const event = await databases.getDocument(DATABASE_ID, "events", eventId);
      // Force re-upload — delete old and replace
    } catch {
      console.log(`  ⊘ ${eventId}: event not found`);
      continue;
    }

    console.log(`  ↓ ${eventId}: downloading...`);
    const buffer = await downloadImage(url);
    if (!buffer) continue;

    try {
      const fileId = `cover-${eventId}`;
      // Delete if exists
      await storage.deleteFile(BUCKET_ID, fileId).catch(() => {});

      const file = await storage.createFile(
        BUCKET_ID,
        fileId,
        InputFile.fromBuffer(buffer, `${eventId}.jpg`),
      );

      const coverUrl = `${endpoint}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=${projectId}`;
      await databases.updateDocument(DATABASE_ID, "events", eventId, { coverimageUrl: coverUrl });

      console.log(`  ✓ ${eventId}: fixed (${(buffer.length / 1024).toFixed(0)}KB)`);
    } catch (err: unknown) {
      console.error(`  ✗ ${eventId}: ${err instanceof Error ? err.message : err}`);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log("\n✅ Done!\n");
}

seed().catch(console.error);
