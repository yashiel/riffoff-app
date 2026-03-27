/**
 * RiffOff QA Seed Script
 *
 * Creates 20 unique events under qa-organizer, then simulates
 * qa-attendee purchasing 1 ticket for each event.
 *
 * Creates: venues → events → ticket tiers → orders → tickets
 * All linked together with real-world data.
 *
 * Usage:
 *   cd src/musicticketing && npx tsx scripts/seed-qa.ts
 *
 * Accounts (pre-existing):
 *   Organizer: qa-organizer@riffoff.test / TestOrganizer@2026!
 *   Attendee:  qa-attendee@riffoff.test  / TestAttendee@2026!
 */

import crypto from "crypto";
import { Client, Databases, ID, Query } from "node-appwrite";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const DATABASE_ID = "riffoff";
const COLLECTIONS = {
  VENUES: "venues",
  EVENTS: "events",
  TICKET_TIERS: "tickettiers",
  ORDERS: "orders",
  TICKETS: "tickets",
  RESERVATIONS: "reservations",
};

const ORGANIZER_USER_ID = "test-organizer-qa";
const ATTENDEE_USER_ID = "test-attendee-qa";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);

const databases = new Databases(client);

// ─── Helper ──────────────────────────────────────────
async function createDoc(
  collectionId: string,
  data: Record<string, unknown>,
  docId?: string,
): Promise<string | null> {
  try {
    const doc = await databases.createDocument(
      DATABASE_ID,
      collectionId,
      docId || ID.unique(),
      data,
    );
    const label =
      (data.name as string) || (data.title as string) || (data.ticketCode as string) || doc.$id;
    console.log(`  ✓ ${collectionId}: ${label}`);
    return doc.$id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists")) {
      console.log(`  ⊘ ${collectionId}: ${docId ?? "?"} already exists — skipping`);
      return docId || "existing";
    }
    console.error(`  ✗ ${collectionId}: ${msg}`);
    return null;
  }
}

function generateTicketCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `RIFF-${code}`;
}

// ─── Picsum image URLs (always-available, no auth, no CORS issues) ──
// Each uses a unique seed for consistent images across re-runs
const COVER_IMAGES = [
  "https://picsum.photos/seed/coldplay-kl/1200/630",
  "https://picsum.photos/seed/taylor-sg/1200/630",
  "https://picsum.photos/seed/ateez-bkk/1200/630",
  "https://picsum.photos/seed/sb19-manila/1200/630",
  "https://picsum.photos/seed/hitc-jakarta/1200/630",
  "https://picsum.photos/seed/mytam-hcmc/1200/630",
  "https://picsum.photos/seed/yoyoma-sg/1200/630",
  "https://picsum.photos/seed/sundown-my/1200/630",
  "https://picsum.photos/seed/lisa-bkk/1200/630",
  "https://picsum.photos/seed/tanya-sg/1200/630",
  "https://picsum.photos/seed/siti-istana/1200/630",
  "https://picsum.photos/seed/benben-mnl/1200/630",
  "https://picsum.photos/seed/phum-bkk/1200/630",
  "https://picsum.photos/seed/techno-sentul/1200/630",
  "https://picsum.photos/seed/celine-mbs/1200/630",
  "https://picsum.photos/seed/kitaro-dfp/1200/630",
  "https://picsum.photos/seed/oor-bkk/1200/630",
  "https://picsum.photos/seed/pamungkas-kl/1200/630",
  "https://picsum.photos/seed/mcr-sg/1200/630",
  "https://picsum.photos/seed/raya-klcc/1200/630",
];

// ─── VENUES (20 unique, real venues across Asia) ─────
const QA_VENUES = [
  { id: "qa-venue-01", name: "Bukit Jalil National Stadium", address: "Jalan Barat, Bukit Jalil, 57000 Kuala Lumpur, Malaysia" },
  { id: "qa-venue-02", name: "The Star Performing Arts Centre", address: "1 Vista Exchange Green, Singapore 138617" },
  { id: "qa-venue-03", name: "Impact Challenger Hall", address: "99 Popular Rd, Pak Kret, Nonthaburi 11120, Thailand" },
  { id: "qa-venue-04", name: "Mall of Asia Arena", address: "Bay City, Pasay, Metro Manila, Philippines" },
  { id: "qa-venue-05", name: "ICE BSD City", address: "Jl. BSD Grand Boulevard, Tangerang, Indonesia" },
  { id: "qa-venue-06", name: "Ho Chi Minh City Opera House", address: "7 Lam Son Square, District 1, Ho Chi Minh City, Vietnam" },
  { id: "qa-venue-07", name: "Esplanade Theatres on the Bay", address: "1 Esplanade Dr, Singapore 038981" },
  { id: "qa-venue-08", name: "Sunway Lagoon Surf Beach", address: "Jalan PJS 11/11, Bandar Sunway, 47500 Selangor, Malaysia" },
  { id: "qa-venue-09", name: "Siam Paragon Royal Hall", address: "991 Rama 1 Rd, Pathumwan, Bangkok 10330, Thailand" },
  { id: "qa-venue-10", name: "Victoria Theatre Singapore", address: "9 Empress Pl, Singapore 179556" },
  { id: "qa-venue-11", name: "Istana Budaya", address: "Jalan Tun Razak, 50694 Kuala Lumpur, Malaysia" },
  { id: "qa-venue-12", name: "Araneta Coliseum", address: "Gen. Romulo Ave, Cubao, Quezon City, Philippines" },
  { id: "qa-venue-13", name: "Muang Thai GMM Live House", address: "8th Floor, CentralWorld, Bangkok, Thailand" },
  { id: "qa-venue-14", name: "Sentul Depot", address: "Jalan Stesen Sentul, 51100 Kuala Lumpur, Malaysia" },
  { id: "qa-venue-15", name: "Marina Bay Sands Grand Ballroom", address: "10 Bayfront Ave, Singapore 018956" },
  { id: "qa-venue-16", name: "Dewan Filharmonik Petronas", address: "Tower 2, Petronas Twin Towers, KLCC, 50088 KL, Malaysia" },
  { id: "qa-venue-17", name: "Thunder Dome Muang Thong Thani", address: "Pak Kret, Nonthaburi, Thailand" },
  { id: "qa-venue-18", name: "KL Live at Life Centre", address: "20 Jalan Sultan Ismail, 50250 Kuala Lumpur, Malaysia" },
  { id: "qa-venue-19", name: "Singapore Indoor Stadium", address: "2 Stadium Walk, Singapore 397691" },
  { id: "qa-venue-20", name: "Plenary Hall KLCC", address: "Kuala Lumpur Convention Centre, 50088 KL, Malaysia" },
];

// ─── EVENTS (20 unique, realistic, no overlap with existing seed) ──
const QA_EVENTS = [
  {
    id: "qa-evt-01",
    venueId: "qa-venue-01",
    title: "Coldplay — Music of the Spheres World Tour KL",
    description: "Coldplay brings their record-breaking Music of the Spheres World Tour to Bukit Jalil National Stadium. LED wristbands, confetti cannons, and every anthem from Yellow to My Universe performed under the stars.",
    genres: ["Pop Rock", "Alternative"],
    startsAt: "2026-09-12T20:00:00+08:00",
    endsAt: "2026-09-12T23:00:00+08:00",
    capacity: 85000,
    tiers: [
      { name: "Infinity Standing", price: 998, currency: "MYR", quota: 5000 },
      { name: "CAT 1 — Lower Bowl", price: 698, currency: "MYR", quota: 20000 },
      { name: "CAT 2 — Upper Bowl", price: 398, currency: "MYR", quota: 30000 },
      { name: "CAT 3 — Nosebleed", price: 198, currency: "MYR", quota: 30000 },
    ],
  },
  {
    id: "qa-evt-02",
    venueId: "qa-venue-02",
    title: "Taylor Swift | The Eras Tour — Singapore (Night 3)",
    description: "The cultural phenomenon continues. Taylor Swift performs a 3.5-hour career-spanning set covering all her eras from Debut to The Tortured Poets Department at The Star.",
    genres: ["Pop", "Country Pop"],
    startsAt: "2026-08-08T19:00:00+08:00",
    endsAt: "2026-08-08T23:00:00+08:00",
    capacity: 5000,
    tiers: [
      { name: "VIP Lover Lounge", price: 498, currency: "SGD", quota: 300 },
      { name: "Premium Seated", price: 348, currency: "SGD", quota: 1500 },
      { name: "Standard", price: 198, currency: "SGD", quota: 3200 },
    ],
  },
  {
    id: "qa-evt-03",
    venueId: "qa-venue-03",
    title: "ATEEZ — TOWARDS THE LIGHT: WILL TO POWER in Bangkok",
    description: "ATEEZ descends on Bangkok with their explosive performances. Eight members, relentless energy, and choreo that will leave you breathless. From Guerrilla to Bouncy — a full spectacle.",
    genres: ["K-Pop", "Pop"],
    startsAt: "2026-07-19T18:30:00+07:00",
    endsAt: "2026-07-19T21:30:00+07:00",
    capacity: 12000,
    tiers: [
      { name: "ATINY Zone (Standing)", price: 5500, currency: "THB", quota: 2000 },
      { name: "CAT 1 — Lower", price: 4000, currency: "THB", quota: 4000 },
      { name: "CAT 2 — Upper", price: 2500, currency: "THB", quota: 6000 },
    ],
  },
  {
    id: "qa-evt-04",
    venueId: "qa-venue-04",
    title: "SB19 — PAGTATAG! World Tour Manila Homecoming",
    description: "The Philippines' biggest P-Pop group returns home for a massive homecoming show. From viral TikTok hits to arena anthems, SB19 proves they're world-class.",
    genres: ["P-Pop", "Pop", "Hip-Hop"],
    startsAt: "2026-06-28T19:00:00+08:00",
    endsAt: "2026-06-28T22:00:00+08:00",
    capacity: 15000,
    tiers: [
      { name: "A'TIN VIP", price: 8500, currency: "PHP", quota: 2000 },
      { name: "Lower Box", price: 5500, currency: "PHP", quota: 5000 },
      { name: "Upper Box", price: 3000, currency: "PHP", quota: 8000 },
    ],
  },
  {
    id: "qa-evt-05",
    venueId: "qa-venue-05",
    title: "Head in the Clouds Jakarta 2026",
    description: "88rising's flagship Asian music festival returns to Jakarta. Joji, NIKI, Rich Brian, Jackson Wang, and special guests across two stages celebrating Asian excellence in hip-hop, R&B, and electronic music.",
    genres: ["Hip-Hop", "R&B", "Electronic"],
    startsAt: "2026-12-06T14:00:00+07:00",
    endsAt: "2026-12-07T23:00:00+07:00",
    capacity: 25000,
    tiers: [
      { name: "2-Day GA", price: 2200000, currency: "IDR", quota: 15000 },
      { name: "2-Day VIP", price: 4500000, currency: "IDR", quota: 3000 },
      { name: "Single Day", price: 1300000, currency: "IDR", quota: 7000 },
    ],
  },
  {
    id: "qa-evt-06",
    venueId: "qa-venue-06",
    title: "Mỹ Tâm — Tri Ân 25 Years Concert",
    description: "Vietnam's Queen of V-Pop celebrates 25 years with a spectacular anniversary concert at the historic Opera House. An intimate evening of ballads, pop hits, and new material.",
    genres: ["V-Pop", "Ballad", "Pop"],
    startsAt: "2026-11-22T19:30:00+07:00",
    endsAt: "2026-11-22T22:00:00+07:00",
    capacity: 1200,
    tiers: [
      { name: "VIP Orchestra", price: 3500000, currency: "VND", quota: 200 },
      { name: "Premium", price: 2000000, currency: "VND", quota: 500 },
      { name: "Standard", price: 1000000, currency: "VND", quota: 500 },
    ],
  },
  {
    id: "qa-evt-07",
    venueId: "qa-venue-07",
    title: "Yo-Yo Ma — Solo Cello Recital",
    description: "Living legend Yo-Yo Ma performs Bach's complete Cello Suites at the Esplanade Concert Hall. A once-in-a-lifetime evening of virtuosic classical music in one of Asia's finest acoustic venues.",
    genres: ["Classical", "Chamber Music"],
    startsAt: "2026-10-18T20:00:00+08:00",
    endsAt: "2026-10-18T22:00:00+08:00",
    capacity: 1600,
    tiers: [
      { name: "Stalls Premium", price: 388, currency: "SGD", quota: 400 },
      { name: "Stalls Standard", price: 248, currency: "SGD", quota: 600 },
      { name: "Circle", price: 148, currency: "SGD", quota: 600 },
    ],
  },
  {
    id: "qa-evt-08",
    venueId: "qa-venue-08",
    title: "Sundown Music Festival 2026",
    description: "An all-day outdoor festival at Sunway Lagoon featuring 30+ artists across EDM, hip-hop, and pop stages. Water park access included with every ticket. Malaysia's wildest music + water combo.",
    genres: ["EDM", "Hip-Hop", "Pop"],
    startsAt: "2026-10-03T12:00:00+08:00",
    endsAt: "2026-10-03T23:59:00+08:00",
    capacity: 12000,
    tiers: [
      { name: "Early Bird GA", price: 149, currency: "MYR", quota: 3000 },
      { name: "General Admission", price: 229, currency: "MYR", quota: 7000 },
      { name: "VIP Cabana", price: 599, currency: "MYR", quota: 2000 },
    ],
  },
  {
    id: "qa-evt-09",
    venueId: "qa-venue-09",
    title: "LISA — LLOUD LIVE in Bangkok",
    description: "BLACKPINK's Thai-born superstar Lisa performs a solo headlining show in her hometown. Expect Rockstar, Money, LALISA, and brand-new tracks from her debut solo album.",
    genres: ["K-Pop", "Pop", "Hip-Hop"],
    startsAt: "2026-08-16T19:00:00+07:00",
    endsAt: "2026-08-16T22:00:00+07:00",
    capacity: 5000,
    tiers: [
      { name: "LLOUD Standing", price: 6800, currency: "THB", quota: 1500 },
      { name: "Seated Premium", price: 4500, currency: "THB", quota: 2000 },
      { name: "Seated Standard", price: 2500, currency: "THB", quota: 1500 },
    ],
  },
  {
    id: "qa-evt-10",
    venueId: "qa-venue-10",
    title: "Tanya Chua — 30th Anniversary Concert",
    description: "Singaporean Mandopop icon Tanya Chua celebrates three decades of music at the intimate Victoria Theatre. Performing hits spanning her legendary career in Mandarin and English.",
    genres: ["Mandopop", "Pop", "Jazz"],
    startsAt: "2026-09-27T20:00:00+08:00",
    endsAt: "2026-09-27T22:30:00+08:00",
    capacity: 900,
    tiers: [
      { name: "Premium", price: 268, currency: "SGD", quota: 300 },
      { name: "Standard", price: 148, currency: "SGD", quota: 600 },
    ],
  },
  {
    id: "qa-evt-11",
    venueId: "qa-venue-11",
    title: "Siti Nurhaliza — The Royal Concert",
    description: "Malaysia's undisputed Voice of Asia performs a regal concert backed by the Malaysian Philharmonic Orchestra. From Bukan Cinta Biasa to Aku Cinta Padamu — every classic, orchestral grandeur.",
    genres: ["Malay Pop", "Ballad", "Classical Crossover"],
    startsAt: "2026-11-08T20:30:00+08:00",
    endsAt: "2026-11-08T23:00:00+08:00",
    capacity: 1400,
    tiers: [
      { name: "Royal Box", price: 888, currency: "MYR", quota: 100 },
      { name: "Diamond", price: 488, currency: "MYR", quota: 400 },
      { name: "Gold", price: 288, currency: "MYR", quota: 900 },
    ],
  },
  {
    id: "qa-evt-12",
    venueId: "qa-venue-12",
    title: "Ben&Ben — Kuwento Tour Manila",
    description: "Filipino folk-pop band Ben&Ben performs their biggest headline show yet. Nine members, acoustic guitars, harmonies, and every OPM anthem that soundtracked a generation.",
    genres: ["OPM", "Folk Pop", "Indie"],
    startsAt: "2026-07-11T19:00:00+08:00",
    endsAt: "2026-07-11T22:00:00+08:00",
    capacity: 15000,
    tiers: [
      { name: "VIP Standing", price: 5000, currency: "PHP", quota: 3000 },
      { name: "Lower Box", price: 3000, currency: "PHP", quota: 5000 },
      { name: "Upper Box", price: 1500, currency: "PHP", quota: 7000 },
    ],
  },
  {
    id: "qa-evt-13",
    venueId: "qa-venue-13",
    title: "Phum Viphurit — Strings & Solitude Tour",
    description: "Thai indie sensation Phum Viphurit performs an intimate set of dreamy indie pop. Known for Lover Boy and Long Gone, this is your chance to hear him in a cozy live house setting.",
    genres: ["Indie Pop", "Dream Pop", "Thai Indie"],
    startsAt: "2026-06-14T20:00:00+07:00",
    endsAt: "2026-06-14T22:30:00+07:00",
    capacity: 1500,
    tiers: [
      { name: "Standing", price: 1800, currency: "THB", quota: 1000 },
      { name: "Balcony Seated", price: 2500, currency: "THB", quota: 500 },
    ],
  },
  {
    id: "qa-evt-14",
    venueId: "qa-venue-14",
    title: "Midnight Frequency — Underground Techno Marathon",
    description: "A 12-hour techno marathon at the industrial Sentul Depot. International and local DJs spinning dark techno, acid house, and minimal from midnight to noon. Warehouse vibes, no frills, pure music.",
    genres: ["Techno", "Acid House", "Minimal"],
    startsAt: "2026-10-31T23:00:00+08:00",
    endsAt: "2026-11-01T11:00:00+08:00",
    capacity: 2000,
    tiers: [
      { name: "Pre-sale", price: 89, currency: "MYR", quota: 500 },
      { name: "General Entry", price: 139, currency: "MYR", quota: 1500 },
    ],
  },
  {
    id: "qa-evt-15",
    venueId: "qa-venue-15",
    title: "Celine Dion — Courage World Tour Singapore",
    description: "The legendary Celine Dion returns to the stage at Marina Bay Sands for a special engagement. Power ballads, My Heart Will Go On, and that voice — an evening of pure emotion.",
    genres: ["Pop", "Ballad", "Adult Contemporary"],
    startsAt: "2026-12-20T20:00:00+08:00",
    endsAt: "2026-12-20T22:30:00+08:00",
    capacity: 2500,
    tiers: [
      { name: "Diamond Suite", price: 888, currency: "SGD", quota: 200 },
      { name: "Premium", price: 488, currency: "SGD", quota: 800 },
      { name: "Standard", price: 268, currency: "SGD", quota: 1500 },
    ],
  },
  {
    id: "qa-evt-16",
    venueId: "qa-venue-16",
    title: "Kitaro — Silk Road Live",
    description: "Japanese new-age legend Kitaro performs his iconic Silk Road suite at the acoustically perfect Dewan Filharmonik. Synthesizers, traditional instruments, and pure ambient bliss.",
    genres: ["New Age", "Ambient", "World Music"],
    startsAt: "2026-09-05T20:00:00+08:00",
    endsAt: "2026-09-05T22:00:00+08:00",
    capacity: 920,
    tiers: [
      { name: "Premium", price: 328, currency: "MYR", quota: 300 },
      { name: "Standard", price: 188, currency: "MYR", quota: 620 },
    ],
  },
  {
    id: "qa-evt-17",
    venueId: "qa-venue-17",
    title: "ONE OK ROCK — Luxury Disease Asia Tour",
    description: "Japan's biggest rock export ONE OK ROCK brings their arena-filling energy to Bangkok. From The Beginning to Save Yourself — anthemic rock that crosses language barriers.",
    genres: ["Rock", "Alternative Rock", "J-Rock"],
    startsAt: "2026-11-15T18:00:00+07:00",
    endsAt: "2026-11-15T21:00:00+07:00",
    capacity: 8000,
    tiers: [
      { name: "Pit Standing", price: 3800, currency: "THB", quota: 2000 },
      { name: "Seated A", price: 2800, currency: "THB", quota: 3000 },
      { name: "Seated B", price: 1800, currency: "THB", quota: 3000 },
    ],
  },
  {
    id: "qa-evt-18",
    venueId: "qa-venue-18",
    title: "Pamungkas — Solipsism 0.2 Tour KL",
    description: "Indonesian singer-songwriter Pamungkas headlines KL Live with his velvety voice and infectious grooves. To The Bone, One Only, and a full band setup — Southeast Asian indie at its finest.",
    genres: ["Indie", "R&B", "Pop"],
    startsAt: "2026-08-23T20:30:00+08:00",
    endsAt: "2026-08-23T23:00:00+08:00",
    capacity: 2000,
    tiers: [
      { name: "Early Bird", price: 128, currency: "MYR", quota: 500 },
      { name: "GA Standing", price: 178, currency: "MYR", quota: 1500 },
    ],
  },
  {
    id: "qa-evt-19",
    venueId: "qa-venue-19",
    title: "My Chemical Romance — The Black Parade is Dead! Asia",
    description: "The emo legends return. My Chemical Romance performs The Black Parade in its entirety plus fan favourites. Helena, Welcome to the Black Parade, I'm Not Okay — a night of pure catharsis.",
    genres: ["Emo", "Alternative Rock", "Pop Punk"],
    startsAt: "2026-10-04T19:00:00+08:00",
    endsAt: "2026-10-04T22:00:00+08:00",
    capacity: 12000,
    tiers: [
      { name: "Standing — Floor", price: 298, currency: "SGD", quota: 3000 },
      { name: "CAT 1 — Lower", price: 228, currency: "SGD", quota: 4000 },
      { name: "CAT 2 — Upper", price: 148, currency: "SGD", quota: 5000 },
    ],
  },
  {
    id: "qa-evt-20",
    venueId: "qa-venue-20",
    title: "Dato' Sri Siti Nurhaliza & Raihan — Aidilfitri Unity Concert",
    description: "A special Hari Raya celebration concert featuring Malaysia's Voice of Asia alongside legendary nasheed group Raihan. Traditional Malay music, nasheeds, and festive anthems at the elegant Plenary Hall.",
    genres: ["Nasheed", "Malay Pop", "Traditional"],
    startsAt: "2026-04-05T20:00:00+08:00",
    endsAt: "2026-04-05T22:30:00+08:00",
    capacity: 3000,
    tiers: [
      { name: "VVIP", price: 588, currency: "MYR", quota: 200 },
      { name: "VIP", price: 368, currency: "MYR", quota: 800 },
      { name: "Standard", price: 168, currency: "MYR", quota: 2000 },
    ],
  },
];

// ─── SEED RUNNER ─────────────────────────────────────
async function seed() {
  console.log("\n🎵 RiffOff QA Seed — 20 Events + Ticket Purchases\n");
  console.log(`Endpoint: ${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}`);
  console.log(`Project:  ${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}\n`);

  // ── 1. Venues ──
  console.log("── Venues ──────────────────────────────");
  for (const venue of QA_VENUES) {
    await createDoc(COLLECTIONS.VENUES, { name: venue.name, address: venue.address, geo: null }, venue.id);
  }

  // ── 2. Events ──
  console.log("\n── Events ──────────────────────────────");
  for (let i = 0; i < QA_EVENTS.length; i++) {
    const evt = QA_EVENTS[i];
    await createDoc(
      COLLECTIONS.EVENTS,
      {
        organiserId: ORGANIZER_USER_ID,
        venueId: evt.venueId,
        title: evt.title,
        description: evt.description,
        genres: evt.genres,
        startsAt: evt.startsAt,
        endsAt: evt.endsAt,
        status: "published",
        capacity: evt.capacity,
        isFree: false,
        coverimageUrl: COVER_IMAGES[i],
      },
      evt.id,
    );
  }

  // ── 3. Ticket Tiers ──
  console.log("\n── Ticket Tiers ────────────────────────");
  // Track first tier per event for purchasing
  const firstTierPerEvent: Map<string, { tierId: string; price: number; currency: string }> = new Map();

  for (const evt of QA_EVENTS) {
    for (let i = 0; i < evt.tiers.length; i++) {
      const tier = evt.tiers[i];
      const tierId = `qa-tier-${evt.id.replace("qa-evt-", "")}-${i}`;
      await createDoc(
        COLLECTIONS.TICKET_TIERS,
        {
          eventId: evt.id,
          name: tier.name,
          price: tier.price,
          currency: tier.currency,
          quota: tier.quota,
          soldCount: 0,
          saleStartsAt: null,
          saleEndsAt: null,
          sortOrder: i,
        },
        tierId,
      );

      // Track first (cheapest VIP or first) tier for purchase
      if (i === 0) {
        firstTierPerEvent.set(evt.id, { tierId, price: tier.price, currency: tier.currency });
      }
    }
  }

  // ── 4. Orders + Tickets (qa-attendee purchases one ticket per event) ──
  console.log("\n── Orders & Tickets (qa-attendee purchases) ──");
  const now = new Date().toISOString();

  for (const evt of QA_EVENTS) {
    const tier = firstTierPerEvent.get(evt.id);
    if (!tier) continue;

    const orderId = `qa-order-${evt.id.replace("qa-evt-", "")}`;
    const ticketId = `qa-ticket-${evt.id.replace("qa-evt-", "")}`;
    const idempotencyKey = `qa-idem-${evt.id}-${ATTENDEE_USER_ID}`;

    // Create order
    await createDoc(
      COLLECTIONS.ORDERS,
      {
        userId: ATTENDEE_USER_ID,
        eventId: evt.id,
        provider: "stripe",
        status: "paid",
        amount: Math.round(tier.price * 100), // cents
        currency: tier.currency,
        providerRef: `qa_sim_${crypto.randomBytes(8).toString("hex")}`,
        idempotencyKey,
        paidAt: now,
        failureReason: null,
      },
      orderId,
    );

    // Create ticket
    const ticketCode = generateTicketCode();
    const nonce = crypto.randomBytes(32).toString("hex");
    const nonceHash = crypto.createHmac("sha256", "qa-seed-key").update(nonce).digest("hex");

    await createDoc(
      COLLECTIONS.TICKETS,
      {
        orderId,
        eventId: evt.id,
        tierId: tier.tierId,
        ownerId: ATTENDEE_USER_ID,
        status: "active",
        qrNonceHash: nonceHash,
        checkedInAt: null,
        checkedInBy: null,
        ticketCode,
      },
      ticketId,
    );

    // Update sold count on tier
    try {
      const tierDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.TICKET_TIERS, tier.tierId);
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.TICKET_TIERS, tier.tierId, {
        soldCount: ((tierDoc.soldCount as number) || 0) + 1,
      });
    } catch {
      /* non-critical */
    }
  }

  // ── Summary ──
  console.log("\n" + "═".repeat(50));
  console.log("✅ QA Seed Complete!\n");
  console.log(`  📍 ${QA_VENUES.length} venues`);
  console.log(`  🎪 ${QA_EVENTS.length} events (all published)`);
  console.log(`  🎫 ${QA_EVENTS.reduce((acc, e) => acc + e.tiers.length, 0)} ticket tiers`);
  console.log(`  💳 ${QA_EVENTS.length} orders (all paid)`);
  console.log(`  🎟️  ${QA_EVENTS.length} tickets (all active)`);
  console.log();
  console.log("┌─────────────────────────────────────────────┐");
  console.log("│  ORGANIZER ACCOUNT                          │");
  console.log("│  Email: qa-organizer@riffoff.test            │");
  console.log("│  Password: TestOrganizer@2026!               │");
  console.log("│                                             │");
  console.log("│  ATTENDEE ACCOUNT                           │");
  console.log("│  Email: qa-attendee@riffoff.test             │");
  console.log("│  Password: TestAttendee@2026!                │");
  console.log("└─────────────────────────────────────────────┘");
  console.log();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
