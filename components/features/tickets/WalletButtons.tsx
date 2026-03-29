"use client";

import { useState, useTransition } from "react";

interface WalletButtonsProps {
  ticketId: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  ticketCode: string;
  tierName: string;
}

export function WalletButtons({
  ticketId,
  eventTitle,
  eventDate,
  venueName,
  ticketCode,
  tierName,
}: WalletButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleGoogleWallet = () => {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/wallet/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId, eventTitle, eventDate, venueName, ticketCode, tierName }),
        });
        const data = await res.json();
        if (data.saveUrl) {
          window.open(data.saveUrl, "_blank");
        } else {
          setError(data.error ?? "Google Wallet is not configured yet");
        }
      } catch {
        setError("Failed to generate wallet pass");
      }
    });
  };

  const handleAppleWallet = () => {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/wallet/apple", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId, eventTitle, eventDate, venueName, ticketCode, tierName }),
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${ticketCode}.pkpass`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          const data = await res.json();
          setError(data.error ?? "Apple Wallet is not configured yet");
        }
      } catch {
        setError("Failed to generate wallet pass");
      }
    });
  };

  return (
    <div className="space-y-2.5">
      {error && (
        <p className="text-center text-sm text-amber-400">{error}</p>
      )}

      <div className="flex gap-2">
        {/* Apple Wallet */}
        <button
          onClick={handleAppleWallet}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-2 border border-border bg-black px-3 py-2.5 text-base font-semibold text-white transition-all hover:bg-black/90 active:scale-[0.98] disabled:opacity-50 dark:border-border dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          <span className="leading-none">
            <span className="block text-[8px] font-normal opacity-60">Add to</span>
            Apple Wallet
          </span>
        </button>

        {/* Google Wallet */}
        <button
          onClick={handleGoogleWallet}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-2 bg-[#1a73e8] px-3 py-2.5 text-base font-semibold text-white transition-all hover:bg-[#1a73e8]/90 active:scale-[0.98] disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
            <path d="M21.35 11.1h-9.18v2.73h5.51c-.24 1.28-.97 2.36-2.06 3.09v2.56h3.33c1.95-1.79 3.07-4.42 3.07-7.55 0-.52-.05-1.02-.14-1.5l-.53.67z" fillOpacity="0" />
            <path d="M3.06 9.72c-.62 1.33-.97 2.82-.97 4.38s.35 3.05.97 4.38l2.87-2.22c-.2-.66-.31-1.38-.31-2.16s.11-1.5.31-2.16L3.06 9.72z" fill="#FBBC05" />
            <path d="M12.18 5.83c1.48 0 2.81.51 3.86 1.5l2.89-2.89C17.09 2.79 14.82 1.83 12.18 1.83c-3.59 0-6.7 2.06-8.22 5.06l2.87 2.22c.68-2.03 2.58-3.28 5.35-3.28z" fill="#EA4335" />
            <path d="M12.18 22.17c2.64 0 4.91-.87 6.75-2.4l-2.87-2.22c-.87.59-1.98.93-3.24.93-2.49 0-4.6-1.68-5.35-3.94l-2.87 2.22c1.52 3.01 4.63 5.41 8.58 5.41z" fill="#34A853" />
            <path d="M21.35 11.1h-9.18v2.73h5.51c-.24 1.28-.97 2.36-2.06 3.09l2.87 2.22c1.67-1.54 2.86-3.82 2.86-6.54 0-.52-.05-1.02-.14-1.5h.14z" fill="#4285F4" />
          </svg>
          <span className="leading-none">
            <span className="block text-[8px] font-normal opacity-70">Add to</span>
            Google Wallet
          </span>
        </button>
      </div>
    </div>
  );
}
