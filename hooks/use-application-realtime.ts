"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { client } from "@/lib/appwrite/client";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import type { ApplicationDoc, ApplicationStatus } from "@/lib/appwrite/types";

type RealtimeEvent = {
  events: string[];
  payload: Record<string, unknown>;
};

interface UseApplicationRealtimeArgs {
  /** The application document ID to watch — pass null to disable */
  applicationId: string | null | undefined;
  /** Initial status fetched server-side */
  initialStatus: ApplicationStatus;
  /**
   * If true, the hook calls router.refresh() whenever the document
   * changes — so any server-rendered list also re-fetches.
   */
  refreshOnUpdate?: boolean;
}

/**
 * Subscribe to live updates for one application document via Appwrite Realtime.
 *
 * Returns the latest status. When the underlying document changes (status
 * update, withdrawal, etc.) the value updates without a page refresh.
 *
 * The subscription is scoped to a single document so we don't fan out
 * change events the artist shouldn't see.
 */
export function useApplicationRealtime({
  applicationId,
  initialStatus,
  refreshOnUpdate = true,
}: UseApplicationRealtimeArgs) {
  const [status, setStatus] = useState<ApplicationStatus>(initialStatus);
  const router = useRouter();
  const lastInitial = useRef(initialStatus);

  // If the server-rendered initialStatus changes (e.g. after a router.refresh),
  // sync it into state so the optimistic value doesn't go stale.
  useEffect(() => {
    if (lastInitial.current !== initialStatus) {
      lastInitial.current = initialStatus;
      setStatus(initialStatus);
    }
  }, [initialStatus]);

  useEffect(() => {
    if (!applicationId) return;

    const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.APPLICATIONS}.documents.${applicationId}`;
    const unsubscribe = client.subscribe(channel, (event: RealtimeEvent) => {
      // We only care about update events — deletions are handled by the parent list.
      const isUpdate = event.events.some((e) => e.endsWith(".update"));
      if (!isUpdate) return;

      const doc = event.payload as unknown as ApplicationDoc;
      if (doc?.status && doc.status !== status) {
        setStatus(doc.status);
      }
      if (refreshOnUpdate) router.refresh();
    });

    return () => {
      try {
        unsubscribe();
      } catch {
        // ignore — subscription was already torn down
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, refreshOnUpdate]);

  return status;
}
