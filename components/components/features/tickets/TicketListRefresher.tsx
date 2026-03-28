"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface TicketListRefresherProps {
  /** Number of tickets that are not yet checked in */
  uncheckedCount: number;
  /** Poll interval in ms (default 15000 = 15s) */
  pollInterval?: number;
}

/**
 * Auto-refreshes the tickets list page when any ticket might have been scanned.
 * Uses router.refresh() to re-render the Server Component with fresh data.
 * Only active when there are unchecked tickets.
 */
export function TicketListRefresher({
  uncheckedCount,
  pollInterval = 15000,
}: TicketListRefresherProps) {
  const router = useRouter();

  useEffect(() => {
    if (uncheckedCount === 0) return;

    const interval = setInterval(() => {
      router.refresh();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [uncheckedCount, pollInterval, router]);

  return null;
}
