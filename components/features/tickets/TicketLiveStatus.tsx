"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface TicketLiveStatusProps {
  ticketId: string;
  initialCheckedIn: boolean;
  /** Poll interval in ms (default 8000 = 8s) */
  pollInterval?: number;
}

/**
 * Invisible component that polls the ticket status.
 * When a ticket transitions from not-checked-in → checked-in,
 * it triggers a router refresh to update the Server Component.
 *
 * Stops polling once checked in (no further changes expected).
 */
export function TicketLiveStatus({
  ticketId,
  initialCheckedIn,
  pollInterval = 8000,
}: TicketLiveStatusProps) {
  const router = useRouter();
  const [isCheckedIn, setIsCheckedIn] = useState(initialCheckedIn);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.checkedIn && !isCheckedIn) {
        setIsCheckedIn(true);
        // Trigger server component re-render
        router.refresh();
      }
    } catch {
      // Network error — silently retry on next interval
    }
  }, [ticketId, isCheckedIn, router]);

  useEffect(() => {
    // Don't poll if already checked in
    if (isCheckedIn) return;

    // Immediate check on mount — avoids waiting full pollInterval after scan
    checkStatus();
    const interval = setInterval(checkStatus, pollInterval);

    return () => clearInterval(interval);
  }, [checkStatus, isCheckedIn, pollInterval]);

  // This component renders nothing — it's purely a side-effect hook
  return null;
}
