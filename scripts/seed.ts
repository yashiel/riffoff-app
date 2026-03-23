/**
 * RiffOff Database Seed Script
 *
 * Populates Appwrite with real music event data from Malaysia, Sri Lanka,
 * Singapore, Thailand, Indonesia, and other countries.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires: .env.local in src/musicticketing/ with APPWRITE credentials
 */

import { Client, Databases, ID } from "node-appwrite";
import * as dotenv from "dotenv";
import * as path from "path";

// Load env from .env.local (same directory level as package.json)
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const DATABASE_ID = "riffoff";
const COLLECTIONS = {
  PROFILES: "profiles",
  VENUES: "venues",
  EVENTS: "events",
  TICKET_TIERS: "tickettiers",
  RSVPS: "rsvps",
  APPLICATIONS: "applications",
};

// ─── Appwrite Client ────────────────────────────────────
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);

const databases = new Databases(client);

// ─── Helper ─────────────────────────────────────────────
async function createDoc(collectionId: string, data: Record<string, unknown>, id?: string) {
  try {
    const doc = await databases.createDocument(DATABASE_ID, collectionId, id || ID.unique(), data);
    console.log(`  ✓ ${collectionId}: ${(data.name as string) || (data.title as string) || (data.displayName as string) || doc.$id}`);
    return doc.$id;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already exists")) {
      console.log(`  ⊘ ${collectionId}: already exists — skipping`);
      return id || "existing";
    }
    console.error(`  ✗ ${collectionId}: ${message}`);
    return null;
  }
}

// ─── VENUES ─────────────────────────────────────────────
const VENUES = [
  // Malaysia
  { id: "venue-axiata-arena", name: "Axiata Arena", address: "Bukit Jalil National Sports Complex, Kuala Lumpur, Malaysia", geo: "3.0553,101.6916" },
  { id: "venue-mec-kl", name: "Mega Star Arena (MEC)", address: "Mid Valley Megamall, Kuala Lumpur, Malaysia", geo: "3.1178,101.6773" },
  { id: "venue-klcc", name: "Kuala Lumpur Convention Centre", address: "Kuala Lumpur City Centre, 50088 KL, Malaysia", geo: "3.1530,101.7113" },
  { id: "venue-surf-beach", name: "Surf Beach @ Sunway Lagoon", address: "Sunway Lagoon, Petaling Jaya, Selangor, Malaysia", geo: "3.0733,101.6069" },
  { id: "venue-zepp-kl", name: "Zepp Kuala Lumpur", address: "Bukit Bintang City Centre, KL, Malaysia", geo: "3.1450,101.7120" },
  { id: "venue-stadium-merdeka", name: "Stadium Merdeka", address: "Jalan Stadium, 50150 Kuala Lumpur, Malaysia", geo: "3.1430,101.6980" },
  { id: "venue-penang-spice", name: "SPICE Arena", address: "SPICE, Bayan Lepas, 11900 Penang, Malaysia", geo: "5.3173,100.2783" },
  { id: "venue-sarawak-cultural", name: "Sarawak Cultural Village", address: "Pantai Damai, Santubong, Sarawak, Malaysia", geo: "1.7269,110.3233" },
  { id: "venue-sepang-circuit", name: "Sepang International Circuit", address: "Sepang, Selangor, Malaysia", geo: "2.7606,101.7383" },
  { id: "venue-genting-arena", name: "Arena of Stars", address: "Resorts World Genting, Pahang, Malaysia", geo: "3.4234,101.7930" },
  // Sri Lanka
  { id: "venue-nelum-pokuna", name: "Nelum Pokuna Mahinda Rajapaksa Theatre", address: "Ananda Coomaraswamy Mawatha, Colombo 07, Sri Lanka", geo: "6.9147,79.8612" },
  { id: "venue-bmc-colombo", name: "Bandaranaike Memorial Conference Hall", address: "Bauddhaloka Mawatha, Colombo 07, Sri Lanka", geo: "6.9120,79.8640" },
  { id: "venue-galle-face", name: "Galle Face Green", address: "Galle Face, Colombo 03, Sri Lanka", geo: "6.9217,79.8460" },
  { id: "venue-stein-studios", name: "Stein Studios", address: "Ratmalana, Colombo, Sri Lanka", geo: "6.8220,79.8830" },
  // Singapore
  { id: "venue-sg-indoor", name: "Singapore Indoor Stadium", address: "2 Stadium Walk, Singapore 397691", geo: "1.3006,103.8745" },
  { id: "venue-sg-national", name: "National Stadium Singapore", address: "1 Stadium Drive, Singapore 397629", geo: "1.3044,103.8745" },
  { id: "venue-sentosa-siloso", name: "Siloso Beach, Sentosa", address: "Sentosa Island, Singapore", geo: "1.2500,103.8125" },
  // Thailand
  { id: "venue-impact-arena", name: "IMPACT Arena", address: "Muang Thong Thani, Nonthaburi, Thailand", geo: "13.9108,100.5553" },
  { id: "venue-rajamangala", name: "Rajamangala National Stadium", address: "Hua Mak, Bang Kapi, Bangkok, Thailand", geo: "13.7555,100.6211" },
  // Indonesia
  { id: "venue-jis-jakarta", name: "Jakarta International Stadium", address: "Tanjung Priok, North Jakarta, Indonesia", geo: "-6.1190,106.8922" },
  { id: "venue-jiexpo-jakarta", name: "JIExpo Kemayoran", address: "Kemayoran, Jakarta, Indonesia", geo: "-6.1517,106.8467" },
  // South Korea (for K-Pop reference)
  { id: "venue-gocheok-dome", name: "Gocheok Sky Dome", address: "Guro-gu, Seoul, South Korea", geo: "37.4981,126.8670" },
  // Japan
  { id: "venue-tokyo-dome", name: "Tokyo Dome", address: "1-3-61 Koraku, Bunkyo, Tokyo, Japan", geo: "35.7056,139.7519" },
];

// ─── PROFILES (sample organisers & artists) ─────────────
const PROFILES = [
  // Organisers
  { id: "profile-liveNation-my", userId: "org-livenation-my", displayName: "Live Nation Malaysia", role: "organiser", phone: "+60321168888", bio: "Asia's leading live entertainment company", timezone: "Asia/Kuala_Lumpur", language: "en", artistGenres: [], socialLinks: ["https://instagram.com/livenationmy"], portfolioUrls: [] },
  { id: "profile-gvf", userId: "org-gvf", displayName: "Good Vibes Festival", role: "organiser", phone: "+60321168800", bio: "Malaysia's premier outdoor music festival", timezone: "Asia/Kuala_Lumpur", language: "en", artistGenres: [], socialLinks: ["https://instagram.com/goodvibesfest"], portfolioUrls: [] },
  { id: "profile-rwmf", userId: "org-rwmf", displayName: "Sarawak Tourism Board", role: "organiser", phone: "+6082423600", bio: "Organisers of the Rainforest World Music Festival", timezone: "Asia/Kuala_Lumpur", language: "en", artistGenres: [], socialLinks: ["https://rwmf.net"], portfolioUrls: [] },
  { id: "profile-sl-events", userId: "org-sl-events", displayName: "Ceylon Live", role: "organiser", phone: "+94112445566", bio: "Sri Lanka's premier concert & event organiser", timezone: "Asia/Colombo", language: "en", artistGenres: [], socialLinks: ["https://instagram.com/ceylonlive"], portfolioUrls: [] },
  { id: "profile-future-ent", userId: "org-future-ent", displayName: "Future Entertainment Asia", role: "organiser", phone: "+6590001234", bio: "Pan-Asian electronic music events and festivals", timezone: "Asia/Singapore", language: "en", artistGenres: [], socialLinks: ["https://instagram.com/futureentasia"], portfolioUrls: [] },
  // Artists
  { id: "profile-yuna", userId: "artist-yuna", displayName: "Yuna", role: "artist", bio: "Malaysian singer-songwriter. Grammy-nominated artist known for blending R&B with indie pop.", timezone: "Asia/Kuala_Lumpur", language: "en", artistGenres: ["R&B", "Indie Pop", "Soul"], socialLinks: ["https://instagram.com/yaborneoyuna", "https://open.spotify.com/artist/0rT0kJJBDCMfYOD7hYBPpB"], portfolioUrls: ["https://yunamusic.com"] },
  { id: "profile-sheila", userId: "artist-sheila", displayName: "Sheila Majid", role: "artist", bio: "Queen of Malaysian Jazz. Legendary voice spanning four decades.", timezone: "Asia/Kuala_Lumpur", language: "ms", artistGenres: ["Jazz", "Pop", "R&B"], socialLinks: ["https://instagram.com/sheilamajid"], portfolioUrls: [] },
  { id: "profile-masdo", userId: "artist-masdo", displayName: "Masdo", role: "artist", bio: "Malaysian indie rock/pop artist. Known for catchy melodies and romantic lyrics.", timezone: "Asia/Kuala_Lumpur", language: "ms", artistGenres: ["Indie Pop", "Rock", "Malay Pop"], socialLinks: ["https://instagram.com/masdo_official"], portfolioUrls: [] },
  { id: "profile-iyer", userId: "artist-iyer", displayName: "Yohani", role: "artist", bio: "Sri Lankan singer who went viral with Manike Mage Hithe. Multi-lingual artist.", timezone: "Asia/Colombo", language: "en", artistGenres: ["Pop", "Sinhala Pop", "Electronic"], socialLinks: ["https://instagram.com/yaborneoyohani"], portfolioUrls: [] },
  { id: "profile-bathiya", userId: "artist-bathiya", displayName: "Bathiya and Santhush (BnS)", role: "artist", bio: "Sri Lanka's most iconic music duo. Decades of hits spanning pop, rock, and baila.", timezone: "Asia/Colombo", language: "en", artistGenres: ["Pop", "Rock", "Baila", "Sinhala"], socialLinks: ["https://instagram.com/baborneonsofficial"], portfolioUrls: [] },
];

// ─── EVENTS ─────────────────────────────────────────────
const EVENTS = [
  // ── Malaysia: K-Pop ──
  {
    id: "evt-blackpink-kl",
    organiserId: "org-livenation-my",
    venueId: "venue-axiata-arena",
    title: "BLACKPINK WORLD TOUR [BORN PINK] KUALA LUMPUR",
    description: "BLACKPINK brings their record-breaking Born Pink World Tour to Kuala Lumpur. Experience the biggest K-Pop act on the planet with a spectacular production featuring hits like Pink Venom, Shut Down, and How You Like That.",
    genres: ["K-Pop", "Pop", "Dance"],
    startsAt: "2026-06-20T20:00:00+08:00",
    endsAt: "2026-06-20T23:00:00+08:00",
    status: "published",
    capacity: 16000,
    isFree: false,
    coverimageUrl: null,
  },
  {
    id: "evt-stray-kids-kl",
    organiserId: "org-livenation-my",
    venueId: "venue-axiata-arena",
    title: "Stray Kids 'dominATE' World Tour in Kuala Lumpur",
    description: "Stray Kids returns to Malaysia with their dominATE World Tour. A high-energy show featuring the 8-member group performing their chart-toppers including God's Menu, Back Door, and MEGAVERSE.",
    genres: ["K-Pop", "Hip-Hop", "EDM"],
    startsAt: "2026-07-12T19:30:00+08:00",
    endsAt: "2026-07-12T22:30:00+08:00",
    status: "published",
    capacity: 16000,
    isFree: false,
    coverimageUrl: null,
  },
  {
    id: "evt-seventeen-kl",
    organiserId: "org-livenation-my",
    venueId: "venue-axiata-arena",
    title: "SEVENTEEN 'RIGHT HERE' WORLD TOUR IN KL",
    description: "13-member powerhouse SEVENTEEN performs in Kuala Lumpur as part of their Right Here World Tour. Known for their synchronised choreography and self-produced music.",
    genres: ["K-Pop", "Pop", "Dance"],
    startsAt: "2026-08-03T19:00:00+08:00",
    endsAt: "2026-08-03T22:00:00+08:00",
    status: "published",
    capacity: 16000,
    isFree: false,
    coverimageUrl: null,
  },
  {
    id: "evt-aespa-kl",
    organiserId: "org-livenation-my",
    venueId: "venue-zepp-kl",
    title: "aespa LIVE TOUR 'SYNK : PARALLEL LINE' in KL",
    description: "SM Entertainment's virtual-meets-reality girl group aespa brings their SYNK tour to Zepp KL. Experience Next Level, Supernova, and Savage live.",
    genres: ["K-Pop", "Pop", "Electronic"],
    startsAt: "2026-09-15T20:00:00+08:00",
    endsAt: "2026-09-15T22:30:00+08:00",
    status: "published",
    capacity: 2800,
    isFree: false,
    coverimageUrl: null,
  },
  {
    id: "evt-ive-kl",
    organiserId: "org-livenation-my",
    venueId: "venue-mec-kl",
    title: "IVE 'SHOW WHAT I HAVE' WORLD TOUR KL",
    description: "IVE showcases their electrifying stage presence with hits like LOVE DIVE, After LIKE, and Baddie. The six-member group's first-ever show in Malaysia.",
    genres: ["K-Pop", "Pop"],
    startsAt: "2026-05-25T19:00:00+08:00",
    endsAt: "2026-05-25T21:30:00+08:00",
    status: "published",
    capacity: 5000,
    isFree: false,
    coverimageUrl: null,
  },
  // ── Malaysia: Festivals ──
  {
    id: "evt-good-vibes-2026",
    organiserId: "org-gvf",
    venueId: "venue-sepang-circuit",
    title: "Good Vibes Festival 2026",
    description: "Malaysia's biggest outdoor music festival returns with an international lineup spanning indie, electronic, hip-hop, and R&B. Two days of music, art, food, and unforgettable vibes under the stars.",
    genres: ["Indie", "Electronic", "Hip-Hop", "R&B"],
    startsAt: "2026-07-18T14:00:00+08:00",
    endsAt: "2026-07-19T23:59:00+08:00",
    status: "published",
    capacity: 25000,
    isFree: false,
    coverimageUrl: null,
  },
  {
    id: "evt-rwmf-2026",
    organiserId: "org-rwmf",
    venueId: "venue-sarawak-cultural",
    title: "Rainforest World Music Festival 2026",
    description: "Set in the lush rainforest of Borneo, RWMF is a 3-day celebration of world music, indigenous culture, and creative workshops. Artists from over 20 countries perform on multiple stages surrounded by tropical jungle.",
    genres: ["World Music", "Folk", "Traditional", "Fusion"],
    startsAt: "2026-06-26T16:00:00+08:00",
    endsAt: "2026-06-28T23:59:00+08:00",
    status: "published",
    capacity: 20000,
    isFree: false,
    coverimageUrl: null,
  },
  // ── Malaysia: Concerts ──
  {
    id: "evt-yuna-homecoming",
    organiserId: "org-livenation-my",
    venueId: "venue-klcc",
    title: "Yuna: Homecoming — An Intimate Evening",
    description: "Grammy-nominated Malaysian star Yuna returns home for a special intimate acoustic set. Performing hits from her entire discography in the elegant setting of KLCC Plenary Hall.",
    genres: ["R&B", "Indie Pop", "Acoustic"],
    startsAt: "2026-08-22T20:00:00+08:00",
    endsAt: "2026-08-22T22:30:00+08:00",
    status: "published",
    capacity: 3000,
    isFree: false,
    coverimageUrl: null,
  },
  {
    id: "evt-sheila-anniversary",
    organiserId: "org-livenation-my",
    venueId: "venue-genting-arena",
    title: "Sheila Majid — 40 Years of Jazz",
    description: "Celebrating four decades of music, the Queen of Malaysian Jazz performs a career-spanning concert backed by a full jazz orchestra. A night of timeless classics.",
    genres: ["Jazz", "Pop", "R&B"],
    startsAt: "2026-10-10T20:30:00+08:00",
    endsAt: "2026-10-10T23:00:00+08:00",
    status: "published",
    capacity: 5000,
    isFree: false,
    coverimageUrl: null,
  },
  {
    id: "evt-edm-night-kl",
    organiserId: "org-future-ent",
    venueId: "venue-zepp-kl",
    title: "NEON Nights: Martin Garrix DJ Set",
    description: "Dutch superstar DJ Martin Garrix headlines a night of progressive house and future bass at Zepp KL. Support from local DJs spinning deep house and techno warm-up sets.",
    genres: ["EDM", "House", "Progressive"],
    startsAt: "2026-09-05T22:00:00+08:00",
    endsAt: "2026-09-06T04:00:00+08:00",
    status: "published",
    capacity: 2800,
    isFree: false,
    coverimageUrl: null,
  },
  // ── Sri Lanka ──
  {
    id: "evt-yohani-live-colombo",
    organiserId: "org-sl-events",
    venueId: "venue-nelum-pokuna",
    title: "Yohani Live in Concert — Colombo",
    description: "The voice behind the viral hit Manike Mage Hithe performs a full concert at Colombo's iconic Nelum Pokuna Theatre. Featuring new material and fan favourites spanning Sinhala pop and electronic beats.",
    genres: ["Pop", "Sinhala Pop", "Electronic"],
    startsAt: "2026-05-17T19:30:00+05:30",
    endsAt: "2026-05-17T22:00:00+05:30",
    status: "published",
    capacity: 2500,
    isFree: false,
    coverimageUrl: null,
  },
  {
    id: "evt-bns-reunion",
    organiserId: "org-sl-events",
    venueId: "venue-bmc-colombo",
    title: "BnS — 25 Years of Hits: The Reunion Concert",
    description: "Bathiya and Santhush reunite for a special anniversary concert celebrating 25 years of Sri Lankan pop music history. From Oba Magemai to Atha Thiyala Diuranna — every hit, one epic night.",
    genres: ["Pop", "Rock", "Baila", "Sinhala"],
    startsAt: "2026-07-05T19:00:00+05:30",
    endsAt: "2026-07-05T22:30:00+05:30",
    status: "published",
    capacity: 3000,
    isFree: false,
    coverimageUrl: null,
  },
  {
    id: "evt-colombo-music-fest",
    organiserId: "org-sl-events",
    venueId: "venue-galle-face",
    title: "Colombo Music Festival 2026",
    description: "An open-air festival on the iconic Galle Face Green. Two stages featuring Sri Lankan and international artists — rock, electronic, indie, and hip-hop under the Indian Ocean sunset.",
    genres: ["Indie", "Rock", "Electronic", "Hip-Hop"],
    startsAt: "2026-11-14T15:00:00+05:30",
    endsAt: "2026-11-15T23:00:00+05:30",
    status: "published",
    capacity: 15000,
    isFree: false,
    coverimageUrl: null,
  },
  {
    id: "evt-underground-colombo",
    organiserId: "org-sl-events",
    venueId: "venue-stein-studios",
    title: "Underground Colombo: Techno Night",
    description: "Colombo's underground electronic music scene comes alive at Stein Studios. Local and regional DJs spinning dark techno, minimal, and acid house until dawn.",
    genres: ["Techno", "Minimal", "Electronic"],
    startsAt: "2026-06-07T22:00:00+05:30",
    endsAt: "2026-06-08T05:00:00+05:30",
    status: "published",
    capacity: 500,
    isFree: false,
    coverimageUrl: null,
  },
  // ── Singapore ──
  {
    id: "evt-twice-sg",
    organiserId: "org-future-ent",
    venueId: "venue-sg-national",
    title: "TWICE 5TH WORLD TOUR 'READY TO BE' — SINGAPORE",
    description: "K-Pop queens TWICE bring their 5th World Tour to Singapore's National Stadium. Nine members, one unforgettable night of polished pop perfection.",
    genres: ["K-Pop", "Pop", "Dance"],
    startsAt: "2026-06-14T18:30:00+08:00",
    endsAt: "2026-06-14T21:30:00+08:00",
    status: "published",
    capacity: 55000,
    isFree: false,
    coverimageUrl: null,
  },
  {
    id: "evt-zoukout-2026",
    organiserId: "org-future-ent",
    venueId: "venue-sentosa-siloso",
    title: "ZoukOut 2026 — Asia's Premier Beach Festival",
    description: "ZoukOut returns to Siloso Beach, Sentosa for an all-night beach party featuring world-class DJs. Dance under the stars with 20,000 revellers on Singapore's most iconic party beach.",
    genres: ["EDM", "House", "Techno", "Trance"],
    startsAt: "2026-12-05T18:00:00+08:00",
    endsAt: "2026-12-06T06:00:00+08:00",
    status: "published",
    capacity: 20000,
    isFree: false,
    coverimageUrl: null,
  },
  // ── Thailand ──
  {
    id: "evt-bts-bangkok",
    organiserId: "org-future-ent",
    venueId: "venue-rajamangala",
    title: "BTS 'FOREVER' WORLD TOUR — BANGKOK",
    description: "Global superstars BTS perform at Rajamangala Stadium for their long-awaited reunion concert. ARMY has waited years for this — Butter, Dynamite, and new music live on the biggest stage.",
    genres: ["K-Pop", "Pop", "Hip-Hop"],
    startsAt: "2026-10-25T18:00:00+07:00",
    endsAt: "2026-10-25T22:00:00+07:00",
    status: "published",
    capacity: 50000,
    isFree: false,
    coverimageUrl: null,
  },
  {
    id: "evt-808-festival",
    organiserId: "org-future-ent",
    venueId: "venue-impact-arena",
    title: "808 Festival Bangkok 2026",
    description: "Thailand's biggest electronic music festival featuring international headliners and Asia's finest DJs. Three stages, world-class production, and an unforgettable night of bass.",
    genres: ["EDM", "Bass", "Dubstep", "Trap"],
    startsAt: "2026-12-12T17:00:00+07:00",
    endsAt: "2026-12-13T04:00:00+07:00",
    status: "published",
    capacity: 30000,
    isFree: false,
    coverimageUrl: null,
  },
  // ── Indonesia ──
  {
    id: "evt-we-the-fest-2026",
    organiserId: "org-future-ent",
    venueId: "venue-jiexpo-jakarta",
    title: "We The Fest 2026",
    description: "Southeast Asia's largest indie and alternative music festival in Jakarta. Three days of music, fashion, food, and art featuring 80+ artists across 6 stages.",
    genres: ["Indie", "Alternative", "Electronic", "Hip-Hop", "Pop"],
    startsAt: "2026-07-24T12:00:00+07:00",
    endsAt: "2026-07-26T23:00:00+07:00",
    status: "published",
    capacity: 40000,
    isFree: false,
    coverimageUrl: null,
  },
  // ── Malaysia: Additional ──
  {
    id: "evt-masdo-penang",
    organiserId: "org-livenation-my",
    venueId: "venue-penang-spice",
    title: "Masdo: Biar Apa Orang Kata Tour — Penang",
    description: "Malaysia's indie darling Masdo brings his Biar Apa Orang Kata national tour to Penang. An evening of sing-along hits and new material from his latest album.",
    genres: ["Indie Pop", "Malay Pop", "Rock"],
    startsAt: "2026-04-19T20:00:00+08:00",
    endsAt: "2026-04-19T22:30:00+08:00",
    status: "published",
    capacity: 4000,
    isFree: false,
    coverimageUrl: null,
  },
  // ── Free RSVP event ──
  {
    id: "evt-kl-jazz-free",
    organiserId: "org-livenation-my",
    venueId: "venue-klcc",
    title: "Jazz in the Park — KLCC Free Concert Series",
    description: "A free outdoor jazz concert in KLCC Park featuring Malaysian jazz musicians. Bring a picnic blanket and enjoy world-class music under the Petronas Twin Towers.",
    genres: ["Jazz", "Fusion", "World Music"],
    startsAt: "2026-05-03T18:00:00+08:00",
    endsAt: "2026-05-03T21:00:00+08:00",
    status: "published",
    capacity: 5000,
    isFree: true,
    coverimageUrl: null,
  },
];

// ─── TICKET TIERS ───────────────────────────────────────
const TICKET_TIERS: Array<{ eventId: string; name: string; price: number; currency: string; quota: number; sortOrder: number }> = [
  // BLACKPINK
  { eventId: "evt-blackpink-kl", name: "CAT 1 — VIP Standing", price: 1288, currency: "MYR", quota: 2000, sortOrder: 0 },
  { eventId: "evt-blackpink-kl", name: "CAT 2 — Premium Seated", price: 888, currency: "MYR", quota: 4000, sortOrder: 1 },
  { eventId: "evt-blackpink-kl", name: "CAT 3 — Standard", price: 588, currency: "MYR", quota: 5000, sortOrder: 2 },
  { eventId: "evt-blackpink-kl", name: "CAT 4 — Upper Tier", price: 388, currency: "MYR", quota: 5000, sortOrder: 3 },
  // Stray Kids
  { eventId: "evt-stray-kids-kl", name: "VIP Soundcheck", price: 998, currency: "MYR", quota: 500, sortOrder: 0 },
  { eventId: "evt-stray-kids-kl", name: "CAT 1", price: 788, currency: "MYR", quota: 3000, sortOrder: 1 },
  { eventId: "evt-stray-kids-kl", name: "CAT 2", price: 588, currency: "MYR", quota: 5000, sortOrder: 2 },
  { eventId: "evt-stray-kids-kl", name: "CAT 3", price: 388, currency: "MYR", quota: 7500, sortOrder: 3 },
  // SEVENTEEN
  { eventId: "evt-seventeen-kl", name: "CARAT ZONE", price: 1088, currency: "MYR", quota: 1500, sortOrder: 0 },
  { eventId: "evt-seventeen-kl", name: "CAT 1", price: 788, currency: "MYR", quota: 4000, sortOrder: 1 },
  { eventId: "evt-seventeen-kl", name: "CAT 2", price: 488, currency: "MYR", quota: 5000, sortOrder: 2 },
  { eventId: "evt-seventeen-kl", name: "CAT 3", price: 288, currency: "MYR", quota: 5500, sortOrder: 3 },
  // aespa
  { eventId: "evt-aespa-kl", name: "Standing — Front", price: 688, currency: "MYR", quota: 800, sortOrder: 0 },
  { eventId: "evt-aespa-kl", name: "Standing — General", price: 488, currency: "MYR", quota: 2000, sortOrder: 1 },
  // IVE
  { eventId: "evt-ive-kl", name: "DIVE — VIP", price: 798, currency: "MYR", quota: 500, sortOrder: 0 },
  { eventId: "evt-ive-kl", name: "CAT 1", price: 598, currency: "MYR", quota: 1500, sortOrder: 1 },
  { eventId: "evt-ive-kl", name: "CAT 2", price: 398, currency: "MYR", quota: 3000, sortOrder: 2 },
  // Good Vibes Festival
  { eventId: "evt-good-vibes-2026", name: "2-Day GA Pass", price: 488, currency: "MYR", quota: 15000, sortOrder: 0 },
  { eventId: "evt-good-vibes-2026", name: "2-Day VIP Pass", price: 888, currency: "MYR", quota: 3000, sortOrder: 1 },
  { eventId: "evt-good-vibes-2026", name: "Single Day GA", price: 298, currency: "MYR", quota: 7000, sortOrder: 2 },
  // RWMF
  { eventId: "evt-rwmf-2026", name: "3-Day Pass", price: 380, currency: "MYR", quota: 12000, sortOrder: 0 },
  { eventId: "evt-rwmf-2026", name: "Single Day Pass", price: 165, currency: "MYR", quota: 8000, sortOrder: 1 },
  // Yuna
  { eventId: "evt-yuna-homecoming", name: "General Admission", price: 198, currency: "MYR", quota: 2000, sortOrder: 0 },
  { eventId: "evt-yuna-homecoming", name: "VIP (Meet & Greet)", price: 488, currency: "MYR", quota: 200, sortOrder: 1 },
  // Sheila Majid
  { eventId: "evt-sheila-anniversary", name: "Premium", price: 388, currency: "MYR", quota: 1500, sortOrder: 0 },
  { eventId: "evt-sheila-anniversary", name: "Standard", price: 188, currency: "MYR", quota: 3500, sortOrder: 1 },
  // EDM Night
  { eventId: "evt-edm-night-kl", name: "Early Bird", price: 148, currency: "MYR", quota: 500, sortOrder: 0 },
  { eventId: "evt-edm-night-kl", name: "General Admission", price: 228, currency: "MYR", quota: 2300, sortOrder: 1 },
  // Yohani
  { eventId: "evt-yohani-live-colombo", name: "Gold Circle", price: 12000, currency: "LKR", quota: 500, sortOrder: 0 },
  { eventId: "evt-yohani-live-colombo", name: "Silver", price: 7500, currency: "LKR", quota: 1000, sortOrder: 1 },
  { eventId: "evt-yohani-live-colombo", name: "Bronze", price: 3500, currency: "LKR", quota: 1000, sortOrder: 2 },
  // BnS
  { eventId: "evt-bns-reunion", name: "VIP", price: 15000, currency: "LKR", quota: 500, sortOrder: 0 },
  { eventId: "evt-bns-reunion", name: "Standard", price: 5000, currency: "LKR", quota: 2500, sortOrder: 1 },
  // Colombo Music Fest
  { eventId: "evt-colombo-music-fest", name: "2-Day Pass", price: 8000, currency: "LKR", quota: 10000, sortOrder: 0 },
  { eventId: "evt-colombo-music-fest", name: "VIP 2-Day", price: 20000, currency: "LKR", quota: 2000, sortOrder: 1 },
  { eventId: "evt-colombo-music-fest", name: "Single Day", price: 5000, currency: "LKR", quota: 3000, sortOrder: 2 },
  // Underground Colombo
  { eventId: "evt-underground-colombo", name: "Entry", price: 3000, currency: "LKR", quota: 500, sortOrder: 0 },
  // TWICE SG
  { eventId: "evt-twice-sg", name: "CAT 1 VIP", price: 388, currency: "SGD", quota: 5000, sortOrder: 0 },
  { eventId: "evt-twice-sg", name: "CAT 2", price: 288, currency: "SGD", quota: 15000, sortOrder: 1 },
  { eventId: "evt-twice-sg", name: "CAT 3", price: 188, currency: "SGD", quota: 20000, sortOrder: 2 },
  { eventId: "evt-twice-sg", name: "CAT 4", price: 108, currency: "SGD", quota: 15000, sortOrder: 3 },
  // ZoukOut
  { eventId: "evt-zoukout-2026", name: "GA", price: 168, currency: "SGD", quota: 15000, sortOrder: 0 },
  { eventId: "evt-zoukout-2026", name: "VIP", price: 388, currency: "SGD", quota: 3000, sortOrder: 1 },
  { eventId: "evt-zoukout-2026", name: "VVIP Table (8 pax)", price: 2888, currency: "SGD", quota: 200, sortOrder: 2 },
  // BTS Bangkok
  { eventId: "evt-bts-bangkok", name: "ARMY ZONE", price: 6500, currency: "THB", quota: 5000, sortOrder: 0 },
  { eventId: "evt-bts-bangkok", name: "CAT 1", price: 5000, currency: "THB", quota: 10000, sortOrder: 1 },
  { eventId: "evt-bts-bangkok", name: "CAT 2", price: 3500, currency: "THB", quota: 15000, sortOrder: 2 },
  { eventId: "evt-bts-bangkok", name: "CAT 3", price: 2000, currency: "THB", quota: 20000, sortOrder: 3 },
  // 808 Festival
  { eventId: "evt-808-festival", name: "Early Bird GA", price: 2500, currency: "THB", quota: 5000, sortOrder: 0 },
  { eventId: "evt-808-festival", name: "GA", price: 3500, currency: "THB", quota: 20000, sortOrder: 1 },
  { eventId: "evt-808-festival", name: "VIP", price: 6000, currency: "THB", quota: 5000, sortOrder: 2 },
  // We The Fest
  { eventId: "evt-we-the-fest-2026", name: "3-Day GA", price: 1800000, currency: "IDR", quota: 25000, sortOrder: 0 },
  { eventId: "evt-we-the-fest-2026", name: "3-Day VIP", price: 3500000, currency: "IDR", quota: 5000, sortOrder: 1 },
  { eventId: "evt-we-the-fest-2026", name: "Single Day", price: 800000, currency: "IDR", quota: 10000, sortOrder: 2 },
  // Masdo Penang
  { eventId: "evt-masdo-penang", name: "GA", price: 88, currency: "MYR", quota: 3000, sortOrder: 0 },
  { eventId: "evt-masdo-penang", name: "VIP", price: 188, currency: "MYR", quota: 1000, sortOrder: 1 },
];

// ─── SEED RUNNER ────────────────────────────────────────
async function seed() {
  console.log("\n🌱 RiffOff Database Seed\n");
  console.log(`Endpoint: ${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}`);
  console.log(`Project: ${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}\n`);

  // 1. Venues
  console.log("── Venues ──────────────────────────────");
  for (const venue of VENUES) {
    await createDoc(COLLECTIONS.VENUES, {
      name: venue.name,
      address: venue.address,
      geo: null,
    }, venue.id);
  }

  // 2. Profiles
  console.log("\n── Profiles ────────────────────────────");
  for (const profile of PROFILES) {
    await createDoc(COLLECTIONS.PROFILES, {
      userId: profile.userId,
      displayName: profile.displayName,
      role: profile.role,
      phone: profile.phone ?? null,
      photoUrl: null,
      bio: profile.bio ?? null,
      timezone: profile.timezone ?? null,
      language: profile.language ?? null,
      deactivatedAt: null,
      artistGenres: profile.artistGenres ?? [],
      socialLinks: profile.socialLinks ?? [],
      portfolioUrls: profile.portfolioUrls ?? [],
    }, profile.id);
  }

  // 3. Events
  console.log("\n── Events ──────────────────────────────");
  for (const event of EVENTS) {
    await createDoc(COLLECTIONS.EVENTS, {
      organiserId: event.organiserId,
      venueId: event.venueId,
      title: event.title,
      description: event.description,
      genres: event.genres,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      status: event.status,
      capacity: event.capacity,
      isFree: event.isFree,
      coverimageUrl: event.coverimageUrl,
    }, event.id);
  }

  // 4. Ticket Tiers
  console.log("\n── Ticket Tiers ────────────────────────");
  for (const tier of TICKET_TIERS) {
    await createDoc(COLLECTIONS.TICKET_TIERS, {
      eventId: tier.eventId,
      name: tier.name,
      price: tier.price,
      currency: tier.currency,
      quota: tier.quota,
      soldCount: 0,
      saleStartsAt: null,
      saleEndsAt: null,
      sortOrder: tier.sortOrder,
    });
  }

  console.log("\n✅ Seed complete!\n");
  console.log(`  ${VENUES.length} venues`);
  console.log(`  ${PROFILES.length} profiles`);
  console.log(`  ${EVENTS.length} events`);
  console.log(`  ${TICKET_TIERS.length} ticket tiers`);
  console.log();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
