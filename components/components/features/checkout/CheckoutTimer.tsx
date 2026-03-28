"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface CheckoutTimerProps {
  expiresAt: string;
  onExpire?: () => void;
}

const TOTAL_SECONDS = 15 * 60; // 15 minute reservation

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

  const isUrgent = timeLeft.total <= 120_000;
  const isExpired = timeLeft.total <= 0;
  const progress = Math.max(0, timeLeft.total / (TOTAL_SECONDS * 1000));

  // SVG circle params
  const size = 56;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  if (isExpired) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
          <Clock className="size-4 text-destructive" aria-hidden="true" />
        </div>
        <div>
          <p className="text-base font-semibold text-destructive">Reservation expired</p>
          <p className="text-sm text-muted-foreground">Please go back and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
        isUrgent
          ? "border-destructive/20 bg-destructive/5"
          : "border-amber-500/20 bg-amber-500/5"
      }`}
      role="timer"
      aria-label={`${timeLeft.minutes} minutes and ${timeLeft.seconds} seconds remaining`}
    >
      {/* Circular progress ring */}
      <div className="relative flex shrink-0 items-center justify-center">
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border"
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={`transition-all duration-1000 ease-linear ${
              isUrgent ? "text-destructive" : "text-coral"
            }`}
          />
        </svg>
        {/* Time inside circle */}
        <span
          className={`absolute text-sm font-bold tabular-nums ${
            isUrgent ? "text-destructive" : "text-coral"
          }`}
        >
          {timeLeft.minutes}:{timeLeft.seconds.toString().padStart(2, "0")}
        </span>
      </div>

      <div>
        <p
          className={`text-base font-semibold ${
            isUrgent
              ? "text-destructive"
              : "text-amber-700 dark:text-amber-400"
          }`}
        >
          {isUrgent ? "Hurry! Time running out" : "Tickets reserved for you"}
        </p>
        <p className="text-sm text-muted-foreground">
          Complete your purchase before the timer runs out
        </p>
      </div>
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
