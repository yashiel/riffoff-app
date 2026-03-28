"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { RefreshCw, Maximize2 } from "lucide-react";

interface QRDisplayProps {
  ticketId: string;
  ticketCode: string;
}

export function QRDisplay({ ticketId, ticketCode }: QRDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isPending = false; // QR generated client-side, no loading state needed

  // Generate QR on mount — just the ticket ID (~20 chars = tiny QR)
  useEffect(() => {
    QRCode.toDataURL(ticketId, {
      width: 300,
      margin: 3,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "H",
    })
      .then(setQrDataUrl)
      .catch(() => setError("Failed to generate QR code"));
  }, [ticketId]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-muted/70 p-8 text-center">
        <p className="text-base text-red-400">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-ghost !text-base">
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center gap-5">
        {/* QR container with subtle glow ring */}
        <button
          onClick={() => setIsFullscreen(true)}
          className="group relative rounded-2xl transition-transform active:scale-[0.98]"
          aria-label="Expand QR code"
        >
          {/* Glow ring on hover */}
          <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-coral/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

          <div className="relative overflow-hidden rounded-xl border border-border bg-white p-3.5 sm:rounded-2xl sm:p-5">
            {isPending || !qrDataUrl ? (
              <div className="flex size-[200px] items-center justify-center sm:size-[240px]">
                <RefreshCw className="size-6 animate-spin text-muted-foreground/60" />
              </div>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={`QR code for ticket ${ticketCode}`}
                  className="size-[200px] sm:size-[240px]"
                />
                {/* Expand hint */}
                <div className="absolute bottom-3 right-3 rounded-full bg-muted p-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <Maximize2 className="size-3.5 text-muted-foreground" />
                </div>
              </>
            )}
          </div>
        </button>

        {/* Ticket code + actions */}
        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <p className="font-mono text-lg font-bold tracking-[0.2em] text-foreground sm:text-xl">
              {ticketCode}
            </p>
            <p className="mt-1 text-sm text-muted-foreground/80">
              Show this QR at the entrance
            </p>
          </div>

          {/* No refresh needed — QR encodes the static ticket ID */}
        </div>
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && qrDataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl"
          onClick={() => setIsFullscreen(false)}
          role="dialog"
          aria-label="QR code fullscreen"
        >
          <div className="flex flex-col items-center gap-8" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-3xl border border-white/10 bg-white p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR code for ticket ${ticketCode}`}
                className="size-[min(300px,70vw)]"
              />
            </div>
            <div className="text-center">
              <p className="font-mono text-2xl font-bold tracking-[0.2em] text-white">
                {ticketCode}
              </p>
              <p className="mt-3 text-base text-white/30">
                Tap anywhere to close
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
