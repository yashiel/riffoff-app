/**
 * Migrate all ticket tier and order currencies to USD
 *
 * Updates the Appwrite database directly — all ticket tiers
 * get their currency changed to USD and prices converted.
 *
 * Usage:
 *   cd src/musicticketing && npx tsx scripts/migrate-currency-usd.ts
 */

import { Client, Databases, Query } from "node-appwrite";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const DATABASE_ID = "riffoff";
const COLLECTIONS = {
  TICKET_TIERS: "tickettiers",
  ORDERS: "orders",
};

// Approximate conversion rates to USD
const TO_USD: Record<string, number> = {
  MYR: 0.22,   // 1 MYR ≈ 0.22 USD
  SGD: 0.75,   // 1 SGD ≈ 0.75 USD
  LKR: 0.003,  // 1 LKR ≈ 0.003 USD
  THB: 0.029,  // 1 THB ≈ 0.029 USD
  IDR: 0.000061, // 1 IDR ≈ 0.000061 USD
  PHP: 0.018,  // 1 PHP ≈ 0.018 USD
  EUR: 1.08,   // 1 EUR ≈ 1.08 USD
  GBP: 1.26,   // 1 GBP ≈ 1.26 USD
  AUD: 0.65,   // 1 AUD ≈ 0.65 USD
  JPY: 0.0067, // 1 JPY ≈ 0.0067 USD
  KRW: 0.00075, // 1 KRW ≈ 0.00075 USD
  USD: 1,
};

function roundPrice(n: number): number {
  // Round to nearest whole dollar for clean pricing
  return Math.round(n);
}

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);

const databases = new Databases(client);

async function fetchAll(collectionId: string) {
  const docs: Array<Record<string, unknown>> = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const result = await databases.listDocuments(DATABASE_ID, collectionId, [
      Query.limit(limit),
      Query.offset(offset),
    ]);
    docs.push(...(result.documents as unknown as Array<Record<string, unknown>>));
    if (result.documents.length < limit) break;
    offset += limit;
  }

  return docs;
}

async function migrateTicketTiers() {
  console.log("\n── Migrating Ticket Tiers ──");
  const tiers = await fetchAll(COLLECTIONS.TICKET_TIERS);
  let updated = 0;
  let skipped = 0;

  for (const tier of tiers) {
    const currency = tier.currency as string;
    if (currency === "USD") {
      skipped++;
      continue;
    }

    const rate = TO_USD[currency];
    if (!rate) {
      console.log(`  ⚠ Unknown currency "${currency}" on tier ${tier.$id} — skipping`);
      skipped++;
      continue;
    }

    const oldPrice = tier.price as number;
    const newPrice = roundPrice(oldPrice * rate);

    try {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.TICKET_TIERS, tier.$id as string, {
        currency: "USD",
        price: newPrice,
      });
      console.log(`  ✓ ${tier.name}: ${currency} ${oldPrice} → USD ${newPrice}`);
      updated++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${tier.$id}: ${msg}`);
    }
  }

  console.log(`  Done: ${updated} updated, ${skipped} skipped (${tiers.length} total)`);
}

async function migrateOrders() {
  console.log("\n── Migrating Orders ──");
  const orders = await fetchAll(COLLECTIONS.ORDERS);
  let updated = 0;
  let skipped = 0;

  for (const order of orders) {
    const currency = order.currency as string;
    if (currency === "USD") {
      skipped++;
      continue;
    }

    const rate = TO_USD[currency];
    if (!rate) {
      console.log(`  ⚠ Unknown currency "${currency}" on order ${order.$id} — skipping`);
      skipped++;
      continue;
    }

    // Order amount is in cents
    const oldAmount = order.amount as number;
    const newAmount = Math.round(oldAmount * rate);

    try {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.ORDERS, order.$id as string, {
        currency: "USD",
        amount: newAmount,
      });
      console.log(`  ✓ Order ${(order.$id as string).slice(0, 8)}: ${currency} ${oldAmount}¢ → USD ${newAmount}¢`);
      updated++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${order.$id}: ${msg}`);
    }
  }

  console.log(`  Done: ${updated} updated, ${skipped} skipped (${orders.length} total)`);
}

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║  Currency Migration → USD            ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`Database: ${DATABASE_ID}`);
  console.log(`Endpoint: ${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}`);

  await migrateTicketTiers();
  await migrateOrders();

  console.log("\n✅ Migration complete!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
