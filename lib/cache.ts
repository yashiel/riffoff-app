import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { Query } from "node-appwrite";
import type { VenueDoc, EventDoc } from "@/lib/appwrite/types";

/**
 * React.cache() deduplicates calls within a single request.
 * These cached fetchers prevent redundant Appwrite queries
 * when multiple components need the same data in one render.
 */

/** Cached venue fetcher — deduped per request */
export const getVenueById = cache(async (venueId: string): Promise<VenueDoc | null> => {
  try {
    const { databases } = await createAdminClient();
    const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.VENUES, venueId);
    return doc as unknown as VenueDoc;
  } catch {
    return null;
  }
});

/** Cached: fetch multiple venues by IDs (batch) */
export const getVenuesByIds = cache(async (venueIds: string[]): Promise<Map<string, VenueDoc>> => {
  const map = new Map<string, VenueDoc>();
  if (venueIds.length === 0) return map;

  const { databases } = await createAdminClient();
  const unique = [...new Set(venueIds)];

  const results = await Promise.all(
    unique.map((id) =>
      databases.getDocument(DATABASE_ID, COLLECTIONS.VENUES, id).catch(() => null),
    ),
  );

  for (const doc of results) {
    if (doc) map.set(doc.$id, doc as unknown as VenueDoc);
  }

  return map;
});

/** Cached: genre list from published events */
export const getCachedGenres = cache(async (): Promise<string[]> => {
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.EVENTS, [
    Query.equal("status", "published"),
    Query.greaterThanEqual("startsAt", new Date().toISOString()),
    Query.select(["genres"]),
    Query.limit(100),
  ]);

  const genreSet = new Set<string>();
  for (const doc of result.documents) {
    const event = doc as unknown as EventDoc;
    for (const genre of event.genres) {
      genreSet.add(genre);
    }
  }

  return [...genreSet].sort();
});

/** Cached: count of published events */
export const getPublishedEventCount = cache(async (): Promise<number> => {
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.EVENTS, [
    Query.equal("status", "published"),
    Query.greaterThanEqual("startsAt", new Date().toISOString()),
    Query.limit(1),
  ]);

  return result.total;
});

/* ─── Cross-request caching (survives across requests for revalidation period) ─── */

/** Cached across requests: all venue data (revalidates every 5 minutes) */
export const getCachedVenues = unstable_cache(
  async (): Promise<Map<string, VenueDoc>> => {
    const { databases } = await createAdminClient();
    const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.VENUES, [
      Query.limit(200),
    ]);
    const map = new Map<string, VenueDoc>();
    for (const doc of result.documents) {
      map.set(doc.$id, doc as unknown as VenueDoc);
    }
    return map;
  },
  ["venues-all"],
  { revalidate: 300 },
);

/** Cached across requests: published event count (revalidates every 60s) */
export const getCachedEventCount = unstable_cache(
  async (): Promise<number> => {
    const { databases } = await createAdminClient();
    const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.EVENTS, [
      Query.equal("status", "published"),
      Query.limit(1),
    ]);
    return result.total;
  },
  ["event-count"],
  { revalidate: 60 },
);

/** Cached across requests: genre list (revalidates every 5 minutes) */
export const getCachedGenreList = unstable_cache(
  async (): Promise<string[]> => {
    const { databases } = await createAdminClient();
    const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.EVENTS, [
      Query.equal("status", "published"),
      Query.select(["genres"]),
      Query.limit(200),
    ]);
    const genreSet = new Set<string>();
    for (const doc of result.documents) {
      const event = doc as unknown as EventDoc;
      for (const genre of event.genres) genreSet.add(genre);
    }
    return [...genreSet].sort();
  },
  ["genres-all"],
  { revalidate: 300 },
);
