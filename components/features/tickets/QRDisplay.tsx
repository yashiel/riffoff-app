"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import QRCode from "qrcode";
import { RefreshCw, Maximize2 } from "lucide-react";
import { getTicketToken } from "@/actions/tickets";

interface QRDisplayProps {
  ticketId: string;
  ticketCode: string;
}

export function QRDisplay({ ticketId, ticketCode }: QRDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFetchedRef = useRef(false);

  function fetchToken() {
    startTransition(async () => {
      setError(null);

      const result = await getTicketToken(ticketId);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(result.token, {
          width: 280,
          margin: 2,
          color: { dark: "#ffffff", light: "#00000000" },
          errorCorrectionLevel: "M",
        });
        setQrDataUrl(dataUrl);

        // Schedule auto-refresh 5 min before expiry via ref (no setState in effect)
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        const msUntilRefresh = (result.expiresAt - 300) * 1000 - Date.now();
        if (msUntilRefresh > 0) {
          refreshTimerRef.current = setTimeout(fetchToken, msUntilRefresh);
        }
      } catch {
        setError("Failed to generate QR code");
      }
    });
  }

  // Initial fetch on mount — using ref guard to avoid double-call in StrictMode
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchToken();
    }
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] p-8 text-center">
        <p className="text-[14px] text-red-400">{error}</p>
        <button onClick={fetchToken} className="btn-ghost !text-[12px]">
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={() => setIsFullscreen(true)}
          className="relative rounded-2xl border border-[var(--border)] bg-[#242424] p-6 transition-all hover:border-[var(--border)]"
          aria-label="Expand QR code"
        >
          {isPending || !qrDataUrl ? (
            <div className="flex size-[280px] items-center justify-center">
              <RefreshCw className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR code for ticket ${ticketCode}`}
                width={280}
                height={280}
                className="rounded-lg"
              />
              <div className="absolute bottom-2 right-2 rounded-full bg-black/50 p-1.5">
                <Maximize2 className="size-3.5 text-foreground/60" />
              </div>
            </>
          )}
        </button>

        <div className="text-center">
          <p className="font-mono text-[20px] font-bold tracking-widest text-foreground">
            {ticketCode}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Show this QR code at the entrance
          </p>
        </div>

        <button
          onClick={fetchToken}
          disabled={isPending}
          className="btn-ghost inline-flex items-center gap-1.5 !text-[12px]"
        >
          <RefreshCw className={`size-3 ${isPending ? "animate-spin" : ""}`} />
          Refresh QR
        </button>
      </div>

      {isFullscreen && qrDataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setIsFullscreen(false)}
          role="dialog"
          aria-label="QR code fullscreen"
        >
          <div className="flex flex-col items-center gap-6" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`QR code for ticket ${ticketCode}`}
              className="size-[min(320px,80vw)] rounded-xl"
            />
            <p className="font-mono text-xl font-bold tracking-widest text-white sm:text-[28px]">
              {ticketCode}
            </p>
            <p className="text-[14px] text-muted-foreground">
              Tap anywhere to close
            </p>
          </div>
        </div>
      )}
    </>
  );
}
