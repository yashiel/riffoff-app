"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { client } from "@/lib/appwrite/client";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";

type RealtimeEvent = {
  events: string[];
  payload: Record<string, unknown>;
};

interface EventApplicationsRealtimeProps {
  /** Event whose application queue we are watching */
  eventId: string;
}

/**
 * Mounted on the organiser's per-event applications dashboard.
 *
 * Subscribes to the entire `applications` collection and triggers a
 * server refresh whenever a document with this eventId changes. The
 * server then re-fetches the queue and streams the updated list back.
 *
 * Renders nothing — it's a side-effect component.
 */
export function EventApplicationsRealtime({ eventId }: EventApplicationsRealtimeProps) {
  const router = useRouter();

  useEffect(() => {
    const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.APPLICATIONS}.documents`;
    const unsubscribe = client.subscribe(channel, (event: RealtimeEvent) => {
      const payloadEventId = (event.payload as { eventId?: string })?.eventId;
      if (payloadEventId !== eventId) return;
      router.refresh();
    });

    return () => {
      try {
        unsubscribe();
      } catch {
        // ignore
      }
    };
  }, [eventId, router]);

  return null;
}
