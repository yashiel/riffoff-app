/**
 * Seed promotional video URLs for events.
 * Run: cd src/musicticketing && export $(grep -v '^#' .env.local | xargs) && node ../scripts/seed-videos.mjs
 */
import { Client, Databases } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT)
  .setKey(process.env.NEXT_APPWRITE_KEY);

const db = new Databases(client);

// Real YouTube promotional videos for events
// These are official trailers, aftermovies, or music videos from the artists
const VIDEO_SEEDS = [
  // K-Pop — official tour trailers / music videos
  { eventId: "evt-txt-kl", videoUrl: "https://youtu.be/p7noV2ssS8E" }, // TXT ACT: TOMORROW trailer (confirmed)
  { eventId: "evt-ive-kl", videoUrl: "https://www.youtube.com/watch?v=AgvwbrWFxWM" }, // IVE World Tour Cinema trailer (confirmed)
  { eventId: "evt-bts-sg", videoUrl: "https://www.youtube.com/watch?v=gdZLi9oWNZg" }, // BTS Dynamite MV (as promo)
  { eventId: "evt-ateez-kl", videoUrl: "https://www.youtube.com/watch?v=iqO0s_jMiPk" }, // ATEEZ WORK MV
  { eventId: "evt-ateez-bkk", videoUrl: "https://www.youtube.com/watch?v=iqO0s_jMiPk" }, // ATEEZ WORK MV
  { eventId: "evt-ateez-manila", videoUrl: "https://www.youtube.com/watch?v=iqO0s_jMiPk" }, // ATEEZ WORK MV
  { eventId: "evt-seventeen-sg", videoUrl: "https://www.youtube.com/watch?v=FZaUPSsmBgE" }, // SEVENTEEN MAESTRO MV
  { eventId: "evt-treasure-kl", videoUrl: "https://www.youtube.com/watch?v=tQE7SVGG8CU" }, // TREASURE MOVE MV
  { eventId: "evt-exo-kl", videoUrl: "https://www.youtube.com/watch?v=pSudEWAYvtY" }, // EXO Let Me In MV
  { eventId: "evt-day6-sg", videoUrl: "https://www.youtube.com/watch?v=gMTc4bNPKkU" }, // DAY6 Welcome to the Show MV
  { eventId: "evt-ive-sg", videoUrl: "https://www.youtube.com/watch?v=AgvwbrWFxWM" }, // IVE World Tour Cinema trailer

  // Rock/International
  { eventId: "evt-mcr-kl", videoUrl: "https://www.youtube.com/watch?v=RRKJiM9Njr8" }, // MCR Welcome to the Black Parade MV
  { eventId: "evt-mcr-sg", videoUrl: "https://www.youtube.com/watch?v=RRKJiM9Njr8" }, // MCR Black Parade MV
  { eventId: "evt-mcr-bkk", videoUrl: "https://www.youtube.com/watch?v=RRKJiM9Njr8" }, // MCR Black Parade MV
  { eventId: "evt-mcr-manila", videoUrl: "https://www.youtube.com/watch?v=RRKJiM9Njr8" }, // MCR Black Parade MV
  { eventId: "evt-bryan-adams-kl", videoUrl: "https://www.youtube.com/watch?v=fV4DiAyExN0" }, // Bryan Adams Summer of 69

  // Malaysian/Sri Lankan artists
  { eventId: "evt-yohani-live-colombo", videoUrl: "https://www.youtube.com/watch?v=GNuJnfGSwKs" }, // Yohani Manike Mage Hithe
  { eventId: "evt-neyo-colombo", videoUrl: "https://www.youtube.com/watch?v=7sGFnXCreTY" }, // Ne-Yo Because Of You
  { eventId: "evt-yuna-homecoming", videoUrl: "https://www.youtube.com/watch?v=Yp56eSJfFqI" }, // Yuna Dan Sebenarnya

  // Festivals — aftermovies
  { eventId: "evt-rwmf-2026", videoUrl: "https://www.youtube.com/watch?v=PYqpjS-QHRI" }, // RWMF highlights
  { eventId: "evt-good-vibes-2026", videoUrl: "https://www.youtube.com/watch?v=UUKxOkF_jBg" }, // Good Vibes aftermovie
];

async function main() {
  console.log(`Seeding ${VIDEO_SEEDS.length} video URLs...\n`);

  let success = 0;
  let failed = 0;

  for (const { eventId, videoUrl } of VIDEO_SEEDS) {
    try {
      await db.updateDocument("riffoff", "events", eventId, { videoUrl });
      console.log(`  ✅ ${eventId}: ${videoUrl.slice(0, 50)}...`);
      success++;
    } catch (e) {
      console.log(`  ❌ ${eventId}: ${e.message?.slice(0, 60)}`);
      failed++;
    }
  }

  console.log(`\n✅ Done: ${success} seeded, ${failed} failed`);
}

main().catch(console.error);
