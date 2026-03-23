"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CheckoutTimerProps {
  expiresAt: string;
  onExpire?: () => void;
}

export function CheckoutTimer({ expiresAt, onExpire }: CheckoutTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(expiresAt));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeLeft(expiresAt);
      setTimeLeft(remaining);

      if (remaining.total <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const isUrgent = timeLeft.total <= 120_000; // Under 2 minutes

  if (timeLeft.total <= 0) {
    return (
      <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        Your reservation has expired. Please start over.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md px-3 py-2 text-sm",
        isUrgent
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      )}
    >
      Tickets held for{" "}
      <span className="font-mono font-semibold tabular-nums">
        {timeLeft.minutes}:{timeLeft.seconds.toString().padStart(2, "0")}
      </span>
    </div>
  );
}

function getTimeLeft(expiresAt: string) {
  const total = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  return {
    total,
    minutes: Math.floor(total / 60000),
    seconds: Math.floor((total % 60000) / 1000),
  };
}
