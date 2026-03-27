/**
 * Seed real artist applications and ticket purchases.
 * Run: npx tsx scripts/seed-test-users.ts
 */

import { Client, Databases, ID, Query, Users } from "node-appwrite";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://yashilanka.com/v1";
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT || "riffoff-dev";
const API_KEY = process.env.NEXT_APPWRITE_KEY || "";

if (!API_KEY) {
  console.error("Set NEXT_APPWRITE_KEY environment variable");
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const databases = new Databases(client);
const users = new Users(client);

const DB = "riffoff";
const C = {
  EVENTS: "events",
  PROFILES: "profiles",
  APPLICATIONS: "applications",
  TICKETS: "tickets",
  TICKET_TIERS: "tickettiers",
};

// ─── Real Malaysian & Sri Lankan Artists ─────────────
const REAL_ARTISTS = [
  {
    name: "Yuna Zarai",
    email: "yuna@riffoff.test",
    bio: "Malaysian singer-songwriter known internationally. Grammy-nominated. Genres: R&B, Pop, Indie. Spotify: 5M+ monthly listeners.",
    genres: ["R&B", "Pop", "Indie"],
    socialLinks: ["https://instagram.com/yabornewideas", "https://open.spotify.com/artist/4nDoRrQiYLOuS8jp04oSbf"],
  },
  {
    name: "Masdo",
    email: "masdo@riffoff.test",
    bio: "Malaysian indie musician and filmmaker. Known for hits like 'Teruna Dan Dara' and 'Bunga'. Pioneer of Malaysian indie pop scene.",
    genres: ["Indie Pop", "Folk", "Alternative"],
    socialLinks: ["https://instagram.com/masdo", "https://open.spotify.com/artist/4RKBBe0G8mHzDhOQMNfh6J"],
  },
  {
    name: "Sheila Majid",
    email: "sheila@riffoff.test",
    bio: "Malaysia's Queen of Jazz. 40+ years in the music industry. Known for 'Lagenda', 'Sinaran', and 'Antara Anyir Dan Jakarta'.",
    genres: ["Jazz", "Pop", "R&B"],
    socialLinks: ["https://instagram.com/sheilamajid"],
  },
  {
    name: "Yohani",
    email: "yohani@riffoff.test",
    bio: "Sri Lankan singer who went viral with 'Manike Mage Hithe' (500M+ YouTube views). Performs in Sinhala, Tamil, Hindi, and English.",
    genres: ["Pop", "Sinhala Pop", "Bollywood"],
    socialLinks: ["https://instagram.com/yohabornewideas", "https://youtube.com/@Yohani"],
  },
  {
    name: "Iraj Weeraratne",
    email: "iraj@riffoff.test",
    bio: "Sri Lanka's pioneering hip-hop and electronic producer. First Sri Lankan to collaborate with Bone Thugs-N-Harmony.",
    genres: ["Hip-Hop", "Electronic", "Pop"],
    socialLinks: ["https://instagram.com/iraj"],
  },
];

// ─── Real Attendee Names (common Malaysian/Sri Lankan names) ─────────────
const REAL_ATTENDEES = [
  { name: "Amirul Haziq", email: "amirul@riffoff.test" },
  { name: "Priya Nair", email: "priya@riffoff.test" },
  { name: "Chen Wei Lin", email: "weilin@riffoff.test" },
  { name: "Sachini Fernando", email: "sachini@riffoff.test" },
  { name: "Tan Kai Xin", email: "kaixin@riffoff.test" },
  { name: "Nurul Aisyah", email: "nurul@riffoff.test" },
  { name: "Rajan Krishnan", email: "rajan@riffoff.test" },
  { name: "Dilshan Perera", email: "dilshan@riffoff.test" },
];

async function createUserAndProfile(
  name: string,
  email: string,
  role: "artist" | "attendee",
  extra?: { bio?: string; genres?: string[]; socialLinks?: string[] },
): Promise<string | null> {
  try {
    const user = await users.create(ID.unique(), email, undefined, "Test1234!", name);
    await databases.createDocument(DB, C.PROFILES, ID.unique(), {
      userId: user.$id,
      displayName: name,
      photoUrl: null,
      role,
      phone: null,
      timezone: "Asia/Kuala_Lumpur",
      language: "en",
      deactivatedAt: null,
      bio: extra?.bio ?? null,
      artistGenres: extra?.genres ?? [],
      socialLinks: extra?.socialLinks ?? [],
      portfolioUrls: [],
    });
    console.log(`  ✅ Created ${role}: ${name} (${email})`);
    return user.$id;
  } catch (e: any) {
    if (e.code === 409) {
      console.log(`  ⏭ ${name} already exists`);
      try {
        const list = await users.list([Query.equal("email", email)]);
        return list.users[0]?.$id ?? null;
      } catch { return null; }
    }
    console.error(`  ❌ ${name}: ${e.message}`);
    return null;
  }
}

async function seedApplications(artistIds: Map<string, string>) {
  console.log("\n🎤 Seeding artist applications...");

  const apps = [
    { artist: "Yuna Zarai", eventId: "evt-good-vibes-2026", status: "shortlisted", notes: "I'd love to headline Good Vibes! I have a new album dropping and this would be the perfect launch." },
    { artist: "Yuna Zarai", eventId: "evt-yuna-homecoming", status: "accepted", notes: "Confirming my own homecoming show. Full band + strings section." },
    { artist: "Masdo", eventId: "evt-masdo-penang", status: "accepted", notes: "Confirming Penang tour stop. Full band with 5 musicians." },
    { artist: "Masdo", eventId: "evt-rwmf-2026", status: "submitted", notes: "We'd love to bring our indie folk sound to the Rainforest stage." },
    { artist: "Sheila Majid", eventId: "evt-sheila-anniversary", status: "accepted", notes: "Confirming my 40th anniversary concert. Full jazz orchestra." },
    { artist: "Yohani", eventId: "evt-yohani-live-colombo", status: "accepted", notes: "Confirming Colombo concert. Will perform Manike Mage Hithe plus new tracks." },
    { artist: "Yohani", eventId: "evt-colombo-music-fest", status: "shortlisted", notes: "Would love to be part of the Colombo Music Festival. 45-min set." },
    { artist: "Iraj Weeraratne", eventId: "evt-underground-colombo", status: "submitted", notes: "Perfect for my electronic/hip-hop fusion set. 2-hour live mix." },
    { artist: "Iraj Weeraratne", eventId: "evt-colombo-music-fest", status: "submitted", notes: "Representing Sri Lankan hip-hop at the festival." },
  ];

  for (const app of apps) {
    const userId = artistIds.get(app.artist);
    if (!userId) continue;
    const appId = `app-${app.eventId.slice(4)}-${userId.slice(0, 6)}`;
    try {
      await databases.createDocument(DB, C.APPLICATIONS, appId, {
        eventId: app.eventId,
        artistId: userId,
        status: app.status,
        notes: app.notes,
        submittedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
      });
      console.log(`  ✅ ${app.artist} → ${app.eventId} (${app.status})`);
    } catch (e: any) {
      if (e.code === 409) console.log(`  ⏭ ${appId} exists`);
      else console.error(`  ❌ ${e.message}`);
    }
  }
}

async function seedTickets(attendeeIds: Map<string, string>) {
  console.log("\n🎫 Seeding ticket purchases...");

  const purchases = [
    { attendee: "Amirul Haziq", eventId: "evt-blackpink-kl" },
    { attendee: "Amirul Haziq", eventId: "evt-stray-kids-kl" },
    { attendee: "Priya Nair", eventId: "evt-seventeen-kl" },
    { attendee: "Priya Nair", eventId: "evt-ive-kl" },
    { attendee: "Chen Wei Lin", eventId: "evt-good-vibes-2026" },
    { attendee: "Chen Wei Lin", eventId: "evt-edm-night-kl" },
    { attendee: "Sachini Fernando", eventId: "evt-yohani-live-colombo" },
    { attendee: "Sachini Fernando", eventId: "evt-colombo-music-fest" },
    { attendee: "Tan Kai Xin", eventId: "evt-bts-sg" },
    { attendee: "Nurul Aisyah", eventId: "evt-twice-sg" },
    { attendee: "Rajan Krishnan", eventId: "evt-808-festival" },
    { attendee: "Dilshan Perera", eventId: "evt-neyo-colombo" },
    { attendee: "Dilshan Perera", eventId: "evt-bns-reunion" },
  ];

  let n = 0;
  for (const p of purchases) {
    const userId = attendeeIds.get(p.attendee);
    if (!userId) continue;

    const tiers = await databases.listDocuments(DB, C.TICKET_TIERS, [
      Query.equal("eventId", p.eventId), Query.limit(1),
    ]);
    if (tiers.documents.length === 0) { console.log(`  ⏭ No tiers for ${p.eventId}`); continue; }

    const tier = tiers.documents[0];
    n++;
    const ticketId = `tkt-${p.eventId.slice(4)}-${userId.slice(0, 6)}`;
    const code = `RIFF-${String(n).padStart(4, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const checkedIn = Math.random() > 0.6;

    try {
      // Generate a deterministic qrNonceHash
      const crypto = await import("crypto");
      const qrNonceHash = crypto.createHash("sha256").update(`${ticketId}-${code}-${Date.now()}`).digest("hex");

      await databases.createDocument(DB, C.TICKETS, ticketId, {
        eventId: p.eventId,
        tierId: tier.$id,
        orderId: `ord-${ticketId}`,
        ownerId: userId,
        ticketCode: code,
        status: "active",
        qrNonceHash,
        checkedInAt: checkedIn ? new Date().toISOString() : null,
        checkedInBy: checkedIn ? userId : null,
      });
      await databases.updateDocument(DB, C.TICKET_TIERS, tier.$id, {
        soldCount: ((tier.soldCount as number) || 0) + 1,
      });
      console.log(`  ✅ ${p.attendee} → ${p.eventId} (${code}${checkedIn ? " ✓" : ""})`);
    } catch (e: any) {
      if (e.code === 409) console.log(`  ⏭ ${ticketId} exists`);
      else console.error(`  ❌ ${e.message}`);
    }
  }
}

async function main() {
  console.log("🌱 Seeding real artists, attendees, applications, and tickets...\n");

  console.log("👤 Creating artist accounts...");
  const artistIds = new Map<string, string>();
  for (const a of REAL_ARTISTS) {
    const id = await createUserAndProfile(a.name, a.email, "artist", a);
    if (id) artistIds.set(a.name, id);
  }

  console.log("\n👤 Creating attendee accounts...");
  const attendeeIds = new Map<string, string>();
  for (const a of REAL_ATTENDEES) {
    const id = await createUserAndProfile(a.name, a.email, "attendee");
    if (id) attendeeIds.set(a.name, id);
  }

  await seedApplications(artistIds);
  await seedTickets(attendeeIds);

  console.log("\n✅ Done!");
}

main().catch(console.error);
