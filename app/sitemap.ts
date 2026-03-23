import type { MetadataRoute } from "next";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import type { EventDoc } from "@/lib/appwrite/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://riffoff.com";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/events`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  // Dynamic event pages
  let eventPages: MetadataRoute.Sitemap = [];
  try {
    const { databases } = await createAdminClient();
    const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.EVENTS, [
      Query.equal("status", "published"),
      Query.greaterThanEqual("startsAt", new Date().toISOString()),
      Query.select(["$id", "$updatedAt"]),
      Query.limit(500),
    ]);

    eventPages = result.documents.map((doc) => {
      const event = doc as unknown as EventDoc;
      return {
        url: `${baseUrl}/events/${event.$id}`,
        lastModified: new Date(event.$updatedAt),
        changeFrequency: "daily" as const,
        priority: 0.8,
      };
    });
  } catch {
    // Sitemap generation should never fail the build
  }

  return [...staticPages, ...eventPages];
}
