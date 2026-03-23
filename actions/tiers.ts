"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import type { EventDoc, TicketTierDoc } from "@/lib/appwrite/types";

const tierSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  currency: z.string().min(1).max(10).default("MYR"),
  quota: z.number().int().min(1),
  saleStartsAt: z.string().nullable().optional(),
  saleEndsAt: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

export type TierResult = { error?: string; tier?: TicketTierDoc };

async function verifyEventOwnership(
  eventId: string,
): Promise<
  | { error: string }
  | { databases: Awaited<ReturnType<typeof createAdminClient>>["databases"]; event: EventDoc; userId: string }
> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const event = (await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.EVENTS,
    eventId,
  )) as unknown as EventDoc;

  if (event.organiserId !== user.$id) return { error: "Not authorized" };
  return { databases, event, userId: user.$id };
}

/** Create a new ticket tier */
export async function createTier(
  input: z.infer<typeof tierSchema>,
): Promise<TierResult> {
  const parsed = tierSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const auth = await verifyEventOwnership(parsed.data.eventId);
  if ("error" in auth) return { error: auth.error };

  try {
    const tier = (await auth.databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.TICKET_TIERS,
      ID.unique(),
      {
        eventId: parsed.data.eventId,
        name: parsed.data.name,
        price: parsed.data.price,
        currency: parsed.data.currency,
        quota: parsed.data.quota,
        soldCount: 0,
        saleStartsAt: parsed.data.saleStartsAt ?? null,
        saleEndsAt: parsed.data.saleEndsAt ?? null,
        sortOrder: parsed.data.sortOrder,
      },
    )) as unknown as TicketTierDoc;

    revalidatePath(`/dashboard/events/${parsed.data.eventId}/tiers`);
    return { tier };
  } catch {
    return { error: "Failed to create tier" };
  }
}

/** Update a ticket tier */
export async function updateTier(
  tierId: string,
  input: Partial<z.infer<typeof tierSchema>>,
): Promise<TierResult> {
  const { databases } = await createAdminClient();

  const tier = (await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.TICKET_TIERS,
    tierId,
  )) as unknown as TicketTierDoc;

  const auth = await verifyEventOwnership(tier.eventId);
  if ("error" in auth) return { error: auth.error };

  // Only allow updating non-sold fields
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.price !== undefined) updates.price = input.price;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.quota !== undefined) {
    if (input.quota < tier.soldCount) {
      return { error: `Quota cannot be less than sold count (${tier.soldCount})` };
    }
    updates.quota = input.quota;
  }
  if (input.saleStartsAt !== undefined) updates.saleStartsAt = input.saleStartsAt;
  if (input.saleEndsAt !== undefined) updates.saleEndsAt = input.saleEndsAt;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  try {
    const updated = (await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.TICKET_TIERS,
      tierId,
      updates,
    )) as unknown as TicketTierDoc;

    revalidatePath(`/dashboard/events/${tier.eventId}/tiers`);
    return { tier: updated };
  } catch {
    return { error: "Failed to update tier" };
  }
}

/** Delete a ticket tier (only if 0 sold) */
export async function deleteTier(tierId: string): Promise<{ error?: string }> {
  const { databases } = await createAdminClient();

  const tier = (await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.TICKET_TIERS,
    tierId,
  )) as unknown as TicketTierDoc;

  if (tier.soldCount > 0) {
    return { error: "Cannot delete a tier with sold tickets" };
  }

  const auth = await verifyEventOwnership(tier.eventId);
  if ("error" in auth) return { error: auth.error };

  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.TICKET_TIERS, tierId);
    revalidatePath(`/dashboard/events/${tier.eventId}/tiers`);
    return {};
  } catch {
    return { error: "Failed to delete tier" };
  }
}

/** Get tiers for an event */
export async function getEventTiers(eventId: string): Promise<TicketTierDoc[]> {
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.TICKET_TIERS,
    [Query.equal("eventId", eventId), Query.orderAsc("sortOrder"), Query.limit(20)],
  );

  return result.documents as unknown as TicketTierDoc[];
}
