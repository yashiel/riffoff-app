/**
 * RiffOff Additional Events Seed
 *
 * Adds 20+ more real events from research data (Malaysia, Sri Lanka, Singapore, Thailand, Indonesia)
 * Run AFTER the main seed.ts
 *
 * Usage: npx tsx scripts/seed-additional.ts
 */

import { Client, Databases, Storage, ID } from "node-appwrite";
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

async function createDoc(collectionId: string, data: Record<string, unknown>, id: string) {
  try {
    await databases.createDocument(DATABASE_ID, collectionId, id, data);
    console.log(`  ✓ ${collectionId}: ${data.title || data.name || id}`);
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists")) {
      console.log(`  ⊘ ${collectionId}: ${id} exists — skipping`);
      return false;
    }
    console.error(`  ✗ ${collectionId}: ${msg}`);
    return false;
  }
}

async function uploadImage(eventId: string, imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "image/*" },
      redirect: "follow",
    });
    if (!response.ok) return null;
    const buf = await response.arrayBuffer();
    const buffer = Buffer.from(buf);
    if (buffer.length < 5000) return null;

    const fileId = `cover-${eventId}`;
    await storage.deleteFile(BUCKET_ID, fileId).catch(() => {});

    const file = await storage.createFile(BUCKET_ID, fileId, InputFile.fromBuffer(buffer, `${eventId}.jpg`));
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT!;
    return `${endpoint}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=${projectId}`;
  } catch {
    return null;
  }
}

// ─── Additional Venues ──────────────────────────────────
const NEW_VENUES = [
  { id: "venue-idea-live-kl", name: "Idea Live Arena", address: "Kuala Lumpur, Malaysia", geo: null },
  { id: "venue-national-stadium-kl", name: "Bukit Jalil National Stadium", address: "Bukit Jalil, Kuala Lumpur, Malaysia", geo: null },
  { id: "venue-hockey-stadium-kl", name: "National Hockey Stadium", address: "Bukit Jalil, Kuala Lumpur, Malaysia", geo: null },
  { id: "venue-lane23-kl", name: "Lane 23", address: "Kuala Lumpur, Malaysia", geo: null },
  { id: "venue-taj-colombo", name: "Taj Samudra", address: "25 Galle Face Centre Road, Colombo, Sri Lanka", geo: null },
  { id: "venue-sugathadasa-colombo", name: "Sugathadasa Outdoor Stadium", address: "Colombo 02, Sri Lanka", geo: null },
  { id: "venue-bitec-bangkok", name: "BITEC Bangna", address: "88 Debaratna Road, Bangna, Bangkok 10260, Thailand", geo: null },
  { id: "venue-thunder-dome-bkk", name: "Thunder Dome Stadium", address: "Muang Thong Thani, Bangkok, Thailand", geo: null },
  { id: "venue-philippine-arena", name: "Philippine Arena", address: "Bulacan, Philippines", geo: null },
  { id: "venue-araneta-manila", name: "Araneta Coliseum", address: "Cubao, Quezon City, Metro Manila, Philippines", geo: null },
];

// ─── Additional Events ──────────────────────────────────
const NEW_EVENTS: Array<{
  id: string;
  organiserId: string;
  venueId: string;
  title: string;
  description: string;
  genres: string[];
  startsAt: string;
  endsAt: string;
  capacity: number;
  isFree: boolean;
  imageUrl: string;
}> = [
  // Malaysia — K-Pop
  {
    id: "evt-txt-kl",
    organiserId: "org-livenation-my",
    venueId: "venue-axiata-arena",
    title: "TOMORROW X TOGETHER 'ACT: TOMORROW' World Tour in KL",
    description: "First-ever TXT concert in Malaysia as part of their ACT: TOMORROW Asia tour. Five members performing their biggest hits including Sugar Rush Ride and 0X1=LOVESONG.",
    genres: ["K-Pop", "Pop"],
    startsAt: "2026-02-14T18:00:00+08:00",
    endsAt: "2026-02-14T21:00:00+08:00",
    capacity: 16000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&h=600&fit=crop",
  },
  {
    id: "evt-ateez-kl",
    organiserId: "org-livenation-my",
    venueId: "venue-axiata-arena",
    title: "ATEEZ 'IN YOUR FANTASY' World Tour — Kuala Lumpur",
    description: "ATEEZ's first solo concert in Malaysia. VIP includes soundcheck, send-off, and exclusive gifts. Eight members delivering powerful choreography and vocals.",
    genres: ["K-Pop", "Pop", "Dance"],
    startsAt: "2026-03-22T18:00:00+08:00",
    endsAt: "2026-03-22T21:00:00+08:00",
    capacity: 16000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop",
  },
  {
    id: "evt-treasure-kl",
    organiserId: "org-livenation-my",
    venueId: "venue-axiata-arena",
    title: "TREASURE 'PULSE ON' World Tour — Kuala Lumpur",
    description: "TREASURE returns to Malaysia as part of their PULSE ON world tour. YG Entertainment's 10-member group performing their catalogue of hits.",
    genres: ["K-Pop", "Pop"],
    startsAt: "2026-05-30T17:00:00+08:00",
    endsAt: "2026-05-30T20:00:00+08:00",
    capacity: 16000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop",
  },
  {
    id: "evt-exo-kl",
    organiserId: "org-livenation-my",
    venueId: "venue-hockey-stadium-kl",
    title: "EXO 'EXhOrizon' Asia Tour — Kuala Lumpur",
    description: "Full EXO group reunion concert — the first Malaysia show in years. Suho, Chanyeol, D.O., Kai, Sehun, and Lay together on stage.",
    genres: ["K-Pop", "Pop", "R&B"],
    startsAt: "2026-06-20T19:00:00+08:00",
    endsAt: "2026-06-20T22:00:00+08:00",
    capacity: 10000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&h=600&fit=crop",
  },
  // Malaysia — International
  {
    id: "evt-mcr-kl",
    organiserId: "org-livenation-my",
    venueId: "venue-national-stadium-kl",
    title: "My Chemical Romance — The Black Parade World Tour KL",
    description: "Two nights at Bukit Jalil National Stadium. First show sold out in 90 minutes. The iconic emo/alternative rock band performing their genre-defining album live.",
    genres: ["Alternative Rock", "Emo", "Post-Hardcore"],
    startsAt: "2026-04-30T19:00:00+08:00",
    endsAt: "2026-05-01T22:00:00+08:00",
    capacity: 60000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=800&h=600&fit=crop",
  },
  {
    id: "evt-bryan-adams-kl",
    organiserId: "org-livenation-my",
    venueId: "venue-idea-live-kl",
    title: "Bryan Adams 'Roll with the Punches' Tour — KL",
    description: "Canadian rock legend Bryan Adams returns to Kuala Lumpur. Summer of '69, Everything I Do, and decades of rock anthems live.",
    genres: ["Rock", "Pop Rock"],
    startsAt: "2026-02-06T20:00:00+08:00",
    endsAt: "2026-02-06T22:30:00+08:00",
    capacity: 4000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&h=600&fit=crop",
  },
  // Malaysia — EDM
  {
    id: "evt-verknipt-kl",
    organiserId: "org-future-ent",
    venueId: "venue-idea-live-kl",
    title: "Verknipt Malaysia 2026",
    description: "Dutch techno festival brand Verknipt makes its Malaysia debut. A night of pounding techno from Europe's finest selectors.",
    genres: ["Techno", "Electronic"],
    startsAt: "2026-05-09T22:00:00+08:00",
    endsAt: "2026-05-10T04:00:00+08:00",
    capacity: 4000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&h=600&fit=crop",
  },
  // Sri Lanka
  {
    id: "evt-swara-colombo",
    organiserId: "org-sl-events",
    venueId: "venue-bmc-colombo",
    title: "SWARA: Live in Concert — Second Edition",
    description: "Second edition of the popular Sinhala music concert series featuring Sri Lanka's contemporary artists performing original compositions.",
    genres: ["Sinhala Pop", "Contemporary"],
    startsAt: "2026-02-07T18:00:00+05:30",
    endsAt: "2026-02-07T21:00:00+05:30",
    capacity: 3000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=600&fit=crop",
  },
  {
    id: "evt-neyo-colombo",
    organiserId: "org-sl-events",
    venueId: "venue-sugathadasa-colombo",
    title: "Ne-Yo Live in Colombo",
    description: "Grammy-winning R&B artist Ne-Yo performs in Sri Lanka for the first time. Miss Independent, So Sick, Closer — a night of smooth R&B hits.",
    genres: ["R&B", "Pop"],
    startsAt: "2026-06-28T18:00:00+05:30",
    endsAt: "2026-06-28T21:00:00+05:30",
    capacity: 15000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
  },
  // Singapore
  {
    id: "evt-seventeen-sg",
    organiserId: "org-future-ent",
    venueId: "venue-sg-national",
    title: "SEVENTEEN 'NEW_' World Tour — Singapore",
    description: "K-Pop's largest performing group brings their NEW_ world tour to Singapore's National Stadium. 13 members, one spectacular show.",
    genres: ["K-Pop", "Pop", "Dance"],
    startsAt: "2026-03-07T18:30:00+08:00",
    endsAt: "2026-03-07T21:30:00+08:00",
    capacity: 55000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop",
  },
  {
    id: "evt-day6-sg",
    organiserId: "org-future-ent",
    venueId: "venue-sg-indoor",
    title: "DAY6 '10th Anniversary: The DECADE' — Singapore",
    description: "Korean rock band DAY6 celebrates 10 years with a special anniversary world tour. VIP soundcheck packages available. K-rock at its finest.",
    genres: ["K-Rock", "Pop Rock", "K-Pop"],
    startsAt: "2026-04-18T18:00:00+08:00",
    endsAt: "2026-04-18T21:00:00+08:00",
    capacity: 12000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&h=600&fit=crop",
  },
  {
    id: "evt-ive-sg",
    organiserId: "org-future-ent",
    venueId: "venue-sg-indoor",
    title: "IVE 'SHOW WHAT I AM' World Tour — Singapore",
    description: "Six-member K-Pop sensation IVE brings their world tour to Singapore Indoor Stadium. VIP soundcheck party access for premium tickets.",
    genres: ["K-Pop", "Pop"],
    startsAt: "2026-05-09T18:00:00+08:00",
    endsAt: "2026-05-09T21:00:00+08:00",
    capacity: 12000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop",
  },
  {
    id: "evt-mcr-sg",
    organiserId: "org-future-ent",
    venueId: "venue-sg-indoor",
    title: "My Chemical Romance — The Black Parade Singapore",
    description: "MCR brings their Black Parade 20th anniversary world tour to Singapore. An unforgettable night of alternative rock anthems.",
    genres: ["Alternative Rock", "Emo"],
    startsAt: "2026-04-28T19:00:00+08:00",
    endsAt: "2026-04-28T22:00:00+08:00",
    capacity: 12000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&h=600&fit=crop",
  },
  {
    id: "evt-bts-sg",
    organiserId: "org-future-ent",
    venueId: "venue-sg-national",
    title: "BTS 'ARIRANG' World Tour — Singapore (4 Nights)",
    description: "BTS's highly anticipated reunion tour after military service. 82+ dates, 34 cities. Four nights at Singapore's National Stadium. ARMY, are you ready?",
    genres: ["K-Pop", "Pop", "Hip-Hop"],
    startsAt: "2026-12-17T18:00:00+08:00",
    endsAt: "2026-12-22T22:00:00+08:00",
    capacity: 55000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&h=600&fit=crop",
  },
  // Thailand
  {
    id: "evt-ateez-bkk",
    organiserId: "org-future-ent",
    venueId: "venue-impact-arena",
    title: "ATEEZ 'IN YOUR FANTASY' World Tour — Bangkok",
    description: "ATEEZ returns to Bangkok after two years. Eight members delivering the powerful performances that made them a global sensation.",
    genres: ["K-Pop", "Pop", "Dance"],
    startsAt: "2026-04-04T18:00:00+07:00",
    endsAt: "2026-04-04T21:00:00+07:00",
    capacity: 12000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=600&fit=crop",
  },
  {
    id: "evt-mcr-bkk",
    organiserId: "org-future-ent",
    venueId: "venue-impact-arena",
    title: "My Chemical Romance — The Black Parade Bangkok",
    description: "MCR's Black Parade 2026 world tour hits Bangkok. The defining emo/alternative rock band of a generation, live.",
    genres: ["Alternative Rock", "Emo"],
    startsAt: "2026-04-22T19:00:00+07:00",
    endsAt: "2026-04-22T22:00:00+07:00",
    capacity: 12000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop",
  },
  // Philippines
  {
    id: "evt-mcr-manila",
    organiserId: "org-future-ent",
    venueId: "venue-philippine-arena",
    title: "My Chemical Romance — The Black Parade Manila",
    description: "MCR at the world's largest indoor arena (55,000 capacity). The Black Parade 20th anniversary tour comes to the Philippines.",
    genres: ["Alternative Rock", "Emo"],
    startsAt: "2026-04-25T19:00:00+08:00",
    endsAt: "2026-04-25T22:00:00+08:00",
    capacity: 55000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop",
  },
  {
    id: "evt-ateez-manila",
    organiserId: "org-future-ent",
    venueId: "venue-araneta-manila",
    title: "ATEEZ 'IN YOUR FANTASY' World Tour — Manila",
    description: "ATEEZ at the iconic Araneta Coliseum. ATINY VIP Standing packages available with exclusive gifts.",
    genres: ["K-Pop", "Pop", "Dance"],
    startsAt: "2026-03-14T18:00:00+08:00",
    endsAt: "2026-03-14T21:00:00+08:00",
    capacity: 15000,
    isFree: false,
    imageUrl: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&h=600&fit=crop",
  },
];

// Ticket tiers for new events
const NEW_TIERS = [
  // TXT KL
  { eventId: "evt-txt-kl", name: "VIP", price: 1098, currency: "MYR", quota: 1000, sortOrder: 0 },
  { eventId: "evt-txt-kl", name: "CAT 1", price: 898, currency: "MYR", quota: 3000, sortOrder: 1 },
  { eventId: "evt-txt-kl", name: "CAT 2", price: 598, currency: "MYR", quota: 5000, sortOrder: 2 },
  { eventId: "evt-txt-kl", name: "CAT 3", price: 398, currency: "MYR", quota: 7000, sortOrder: 3 },
  // ATEEZ KL
  { eventId: "evt-ateez-kl", name: "VIP Soundcheck", price: 1198, currency: "MYR", quota: 500, sortOrder: 0 },
  { eventId: "evt-ateez-kl", name: "CAT 1", price: 898, currency: "MYR", quota: 3000, sortOrder: 1 },
  { eventId: "evt-ateez-kl", name: "CAT 2", price: 598, currency: "MYR", quota: 5000, sortOrder: 2 },
  { eventId: "evt-ateez-kl", name: "CAT 3", price: 398, currency: "MYR", quota: 7500, sortOrder: 3 },
  // TREASURE KL
  { eventId: "evt-treasure-kl", name: "CAT 1", price: 888, currency: "MYR", quota: 3000, sortOrder: 0 },
  { eventId: "evt-treasure-kl", name: "CAT 2", price: 599, currency: "MYR", quota: 5000, sortOrder: 1 },
  { eventId: "evt-treasure-kl", name: "CAT 3", price: 399, currency: "MYR", quota: 8000, sortOrder: 2 },
  // EXO KL
  { eventId: "evt-exo-kl", name: "VIP", price: 1098, currency: "MYR", quota: 1000, sortOrder: 0 },
  { eventId: "evt-exo-kl", name: "CAT 1", price: 798, currency: "MYR", quota: 3000, sortOrder: 1 },
  { eventId: "evt-exo-kl", name: "CAT 2", price: 498, currency: "MYR", quota: 6000, sortOrder: 2 },
  // MCR KL (2 nights)
  { eventId: "evt-mcr-kl", name: "Helena Seated", price: 1099, currency: "MYR", quota: 5000, sortOrder: 0 },
  { eventId: "evt-mcr-kl", name: "GA Standing", price: 699, currency: "MYR", quota: 20000, sortOrder: 1 },
  { eventId: "evt-mcr-kl", name: "Zone E Seated", price: 299, currency: "MYR", quota: 35000, sortOrder: 2 },
  // Bryan Adams
  { eventId: "evt-bryan-adams-kl", name: "Platinum", price: 758, currency: "MYR", quota: 500, sortOrder: 0 },
  { eventId: "evt-bryan-adams-kl", name: "Gold", price: 658, currency: "MYR", quota: 1000, sortOrder: 1 },
  { eventId: "evt-bryan-adams-kl", name: "CAT 1", price: 598, currency: "MYR", quota: 1000, sortOrder: 2 },
  { eventId: "evt-bryan-adams-kl", name: "CAT 2", price: 498, currency: "MYR", quota: 1500, sortOrder: 3 },
  // Verknipt
  { eventId: "evt-verknipt-kl", name: "Early Bird", price: 188, currency: "MYR", quota: 1000, sortOrder: 0 },
  { eventId: "evt-verknipt-kl", name: "GA", price: 288, currency: "MYR", quota: 3000, sortOrder: 1 },
  // SWARA Colombo
  { eventId: "evt-swara-colombo", name: "VIP", price: 10000, currency: "LKR", quota: 500, sortOrder: 0 },
  { eventId: "evt-swara-colombo", name: "Standard", price: 3000, currency: "LKR", quota: 2500, sortOrder: 1 },
  // Ne-Yo Colombo
  { eventId: "evt-neyo-colombo", name: "Gold", price: 75000, currency: "LKR", quota: 1000, sortOrder: 0 },
  { eventId: "evt-neyo-colombo", name: "Silver", price: 35000, currency: "LKR", quota: 5000, sortOrder: 1 },
  { eventId: "evt-neyo-colombo", name: "Bronze", price: 15000, currency: "LKR", quota: 9000, sortOrder: 2 },
  // SEVENTEEN SG
  { eventId: "evt-seventeen-sg", name: "CAT 1", price: 399, currency: "SGD", quota: 10000, sortOrder: 0 },
  { eventId: "evt-seventeen-sg", name: "CAT 2", price: 299, currency: "SGD", quota: 20000, sortOrder: 1 },
  { eventId: "evt-seventeen-sg", name: "CAT 3", price: 199, currency: "SGD", quota: 25000, sortOrder: 2 },
  // DAY6 SG
  { eventId: "evt-day6-sg", name: "VIP Soundcheck", price: 348, currency: "SGD", quota: 500, sortOrder: 0 },
  { eventId: "evt-day6-sg", name: "CAT 1", price: 288, currency: "SGD", quota: 3000, sortOrder: 1 },
  { eventId: "evt-day6-sg", name: "CAT 2", price: 228, currency: "SGD", quota: 4000, sortOrder: 2 },
  { eventId: "evt-day6-sg", name: "CAT 3", price: 158, currency: "SGD", quota: 4500, sortOrder: 3 },
  // IVE SG
  { eventId: "evt-ive-sg", name: "VIP", price: 368, currency: "SGD", quota: 1000, sortOrder: 0 },
  { eventId: "evt-ive-sg", name: "CAT 1", price: 288, currency: "SGD", quota: 3000, sortOrder: 1 },
  { eventId: "evt-ive-sg", name: "CAT 2", price: 188, currency: "SGD", quota: 8000, sortOrder: 2 },
  // MCR SG
  { eventId: "evt-mcr-sg", name: "CAT 1", price: 350, currency: "SGD", quota: 3000, sortOrder: 0 },
  { eventId: "evt-mcr-sg", name: "CAT 2", price: 250, currency: "SGD", quota: 5000, sortOrder: 1 },
  { eventId: "evt-mcr-sg", name: "GA Standing", price: 150, currency: "SGD", quota: 4000, sortOrder: 2 },
  // BTS SG
  { eventId: "evt-bts-sg", name: "ARMY ZONE", price: 500, currency: "SGD", quota: 5000, sortOrder: 0 },
  { eventId: "evt-bts-sg", name: "CAT 1", price: 388, currency: "SGD", quota: 15000, sortOrder: 1 },
  { eventId: "evt-bts-sg", name: "CAT 2", price: 288, currency: "SGD", quota: 20000, sortOrder: 2 },
  { eventId: "evt-bts-sg", name: "CAT 3", price: 200, currency: "SGD", quota: 15000, sortOrder: 3 },
  // ATEEZ BKK
  { eventId: "evt-ateez-bkk", name: "VIP", price: 8500, currency: "THB", quota: 1000, sortOrder: 0 },
  { eventId: "evt-ateez-bkk", name: "CAT 1", price: 5500, currency: "THB", quota: 3000, sortOrder: 1 },
  { eventId: "evt-ateez-bkk", name: "CAT 2", price: 3000, currency: "THB", quota: 8000, sortOrder: 2 },
  // MCR BKK
  { eventId: "evt-mcr-bkk", name: "CAT 1", price: 8000, currency: "THB", quota: 3000, sortOrder: 0 },
  { eventId: "evt-mcr-bkk", name: "CAT 2", price: 5000, currency: "THB", quota: 5000, sortOrder: 1 },
  { eventId: "evt-mcr-bkk", name: "GA", price: 3000, currency: "THB", quota: 4000, sortOrder: 2 },
  // MCR Manila
  { eventId: "evt-mcr-manila", name: "Premium", price: 15000, currency: "PHP", quota: 5000, sortOrder: 0 },
  { eventId: "evt-mcr-manila", name: "GA Upper", price: 7500, currency: "PHP", quota: 25000, sortOrder: 1 },
  { eventId: "evt-mcr-manila", name: "GA Lower", price: 3500, currency: "PHP", quota: 25000, sortOrder: 2 },
  // ATEEZ Manila
  { eventId: "evt-ateez-manila", name: "ATINY VIP Standing", price: 20000, currency: "PHP", quota: 1000, sortOrder: 0 },
  { eventId: "evt-ateez-manila", name: "CAT 1", price: 12000, currency: "PHP", quota: 4000, sortOrder: 1 },
  { eventId: "evt-ateez-manila", name: "CAT 2", price: 7500, currency: "PHP", quota: 5000, sortOrder: 2 },
  { eventId: "evt-ateez-manila", name: "CAT 3", price: 4500, currency: "PHP", quota: 5000, sortOrder: 3 },
];

async function seed() {
  console.log("\n🌱 Additional Events Seed\n");

  // 1. Venues
  console.log("── New Venues ──────────────────────────");
  for (const v of NEW_VENUES) {
    await createDoc("venues", { name: v.name, address: v.address, geo: v.geo }, v.id);
  }

  // 2. Events + Images
  console.log("\n── New Events + Images ─────────────────");
  for (const evt of NEW_EVENTS) {
    const created = await createDoc("events", {
      organiserId: evt.organiserId,
      venueId: evt.venueId,
      title: evt.title,
      description: evt.description,
      genres: evt.genres,
      startsAt: evt.startsAt,
      endsAt: evt.endsAt,
      status: "published",
      capacity: evt.capacity,
      isFree: evt.isFree,
      coverimageUrl: null,
    }, evt.id);

    if (created) {
      const coverUrl = await uploadImage(evt.id, evt.imageUrl);
      if (coverUrl) {
        await databases.updateDocument(DATABASE_ID, "events", evt.id, { coverimageUrl: coverUrl });
        console.log(`    📷 Image uploaded`);
      }
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  // 3. Ticket Tiers
  console.log("\n── New Ticket Tiers ────────────────────");
  for (const tier of NEW_TIERS) {
    await createDoc("tickettiers", {
      eventId: tier.eventId,
      name: tier.name,
      price: tier.price,
      currency: tier.currency,
      quota: tier.quota,
      soldCount: 0,
      saleStartsAt: null,
      saleEndsAt: null,
      sortOrder: tier.sortOrder,
    }, ID.unique());
  }

  console.log(`\n✅ Done!`);
  console.log(`  ${NEW_VENUES.length} venues`);
  console.log(`  ${NEW_EVENTS.length} events`);
  console.log(`  ${NEW_TIERS.length} ticket tiers\n`);
}

seed().catch(console.error);
