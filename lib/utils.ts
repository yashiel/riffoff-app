import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency amount from smallest unit (cents/sen) to display string.
 * tickettiers.price is stored as double, so we accept both integer cents and float.
 */
export function formatCurrency(amount: number, currency = "MYR"): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format integer cents to currency display.
 * Use for orders.amount and disputes.amount (stored as integer cents).
 */
export function formatCentsToDisplay(cents: number, currency = "MYR"): string {
  return formatCurrency(cents / 100, currency);
}

/** Format ISO datetime string to localized display */
export function formatDate(isoString: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(new Date(isoString));
}

/** Format ISO datetime to relative time ("2 hours ago", "in 3 days") */
export function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const target = new Date(isoString).getTime();
  const diffMs = target - now;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffDay) >= 1) return rtf.format(diffDay, "day");
  if (Math.abs(diffHr) >= 1) return rtf.format(diffHr, "hour");
  if (Math.abs(diffMin) >= 1) return rtf.format(diffMin, "minute");
  return rtf.format(diffSec, "second");
}
