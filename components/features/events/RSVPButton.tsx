"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createOrUpdateRSVP } from "@/actions/rsvps";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import type { RSVPStatus } from "@/lib/appwrite/types";

interface RSVPButtonProps {
  eventId: string;
  currentStatus: RSVPStatus | null;
  rsvpCount: number;
}

export function RSVPButton({
  eventId,
  currentStatus,
  rsvpCount,
}: RSVPButtonProps) {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<RSVPStatus | null>(currentStatus);
  const [count, setCount] = useState(rsvpCount);
  const [isPending, startTransition] = useTransition();

  function handleRSVP(newStatus: RSVPStatus) {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=/events/${eventId}`;
      return;
    }

    const prevStatus = status;
    const prevCount = count;

    // Optimistic update
    setStatus(newStatus);
    if (newStatus === "going" && prevStatus !== "going") {
      setCount((c) => c + 1);
    } else if (newStatus !== "going" && prevStatus === "going") {
      setCount((c) => Math.max(0, c - 1));
    }

    startTransition(async () => {
      const result = await createOrUpdateRSVP(eventId, newStatus);
      if (result.error) {
        // Revert on error
        setStatus(prevStatus);
        setCount(prevCount);
      }
    });
  }

  const isGoing = status === "going";
  const isInterested = status === "interested";

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">RSVP</h2>
      <div className="flex gap-2">
        <Button
          onClick={() => handleRSVP("going")}
          disabled={isPending}
          variant={isGoing ? "default" : "outline"}
          className={cn(isGoing && "bg-emerald-600 hover:bg-emerald-700")}
        >
          {isGoing ? "Going" : "I'm going"}
        </Button>
        <Button
          onClick={() => handleRSVP("interested")}
          disabled={isPending}
          variant={isInterested ? "default" : "outline"}
        >
          Interested
        </Button>
      </div>
      {count > 0 && (
        <p className="text-base text-muted-foreground">
          {count} {count === 1 ? "person" : "people"} going
        </p>
      )}
    </div>
  );
}
