"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { QrCode, KeyRound, RefreshCw, Copy, Check, Ticket, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { generateAccessQR, generateAccessPIN } from "@/actions/gate";

interface AccessCodeGeneratorProps {
  eventId: string;
  gateId: string;
}

/**
 * Unified access code generator — generates BOTH QR and PIN together
 * in a single action. Staff can use either method to connect.
 */
export function AccessCodeGenerator({
  eventId,
  gateId,
}: AccessCodeGeneratorProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [copiedQR, setCopiedQR] = useState(false);
  const [copiedPIN, setCopiedPIN] = useState(false);

  const generateBoth = useCallback(() => {
    setError("");
    startTransition(async () => {
      try {
        // Generate both QR and PIN in parallel
        const [qrResult, pinResult] = await Promise.all([
          generateAccessQR(eventId, gateId),
          generateAccessPIN(eventId, gateId),
        ]);

        const dataUrl = await QRCode.toDataURL(qrResult.qrData, {
          width: 300,
          margin: 3,
          errorCorrectionLevel: "H", // High error correction for screen scanning
          color: { dark: "#000000", light: "#ffffff" },
        });

        setQrDataUrl(dataUrl);
        setPin(pinResult.pin);
        // Use the shorter expiry of the two
        setExpiresAt(
          qrResult.expiresAt < pinResult.expiresAt
            ? qrResult.expiresAt
            : pinResult.expiresAt,
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to generate access codes",
        );
        setQrDataUrl(null);
        setPin(null);
        setExpiresAt(null);
      }
    });
  }, [eventId, gateId]);

  // Auto-refresh when expired
  useEffect(() => {
    if (!expiresAt) return;
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return;
    const timer = setTimeout(generateBoth, ms);
    return () => clearTimeout(timer);
  }, [expiresAt, generateBoth]);

  async function copyQR() {
    if (!qrDataUrl) return;
    try {
      const blob = await (await fetch(qrDataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopiedQR(true);
      setTimeout(() => setCopiedQR(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  }

  async function copyPIN() {
    if (!pin) return;
    try {
      await navigator.clipboard.writeText(pin);
      setCopiedPIN(true);
      setTimeout(() => setCopiedPIN(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  }

  async function shareAccess() {
    if (!pin) return;
    const text = `RiffOff Gate Access\nPIN: ${pin}\nExpires in 15 minutes`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "RiffOff Gate Access", text });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(text);
      setCopiedPIN(true);
      setTimeout(() => setCopiedPIN(false), 2000);
    }
  }

  // ── Not yet generated ──
  if (!qrDataUrl && !pin) {
    return (
      <div className="mt-4">
        {error && (
          <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          onClick={generateBoth}
          disabled={isPending}
          className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-5 py-3.5 text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
        >
          <Ticket className={`size-5 ${isPending ? "animate-spin" : "transition-transform group-hover:rotate-12"}`} />
          {isPending ? "Generating..." : "Generate Access Code"}
        </button>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Creates both QR code and PIN for gate staff
        </p>
      </div>
    );
  }

  // ── Generated — show both codes ──
  return (
    <div className="mt-4 space-y-4">
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Timer + Refresh row */}
      <div className="flex items-center justify-between">
        {expiresAt && <CountdownTimer expiresAt={expiresAt} />}
        <div className="flex gap-2">
          <button
            onClick={shareAccess}
            className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Share2 className="size-3.5" />
            Share
          </button>
          <button
            onClick={generateBoth}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
            New Code
          </button>
        </div>
      </div>

      {/* Two-column: QR + PIN */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* QR Code */}
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <QrCode className="size-4" />
            Scan QR
          </div>
          {qrDataUrl && (
            <div className="rounded-xl bg-white p-4 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Gate access QR code"
                className="size-[220px] sm:size-[260px]"
              />
            </div>
          )}
          <button
            onClick={copyQR}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copiedQR ? (
              <>
                <Check className="size-3.5 text-emerald-400" /> Copied!
              </>
            ) : (
              <>
                <Copy className="size-3.5" /> Copy QR Image
              </>
            )}
          </button>
        </div>

        {/* PIN Code */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <KeyRound className="size-4" />
            Enter PIN
          </div>
          <div className="mb-3 flex items-center justify-center rounded-xl bg-muted px-6 py-4">
            <p
              className="font-mono text-4xl font-bold tracking-[0.4em] text-foreground"
              aria-label={`PIN code: ${pin?.split("").join(" ")}`}
            >
              {pin}
            </p>
          </div>
          <p className="mb-2 text-sm text-muted-foreground">
            50 uses max · Staff enters this on the scanner app
          </p>
          <button
            onClick={copyPIN}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copiedPIN ? (
              <>
                <Check className="size-3.5 text-emerald-400" /> Copied!
              </>
            ) : (
              <>
                <Copy className="size-3.5" /> Copy PIN
              </>
            )}
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Share either code with gate staff. They&apos;ll scan the QR or enter the PIN on the{" "}
        <span className="font-medium text-foreground">RiffOff Gate</span> app to start scanning tickets.
      </p>
    </div>
  );
}

// ─── Countdown Timer ────────────────────────────────────

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
      );
      setRemaining(secs);
      if (secs <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isLow = remaining < 120;

  return (
    <p
      className={`font-mono text-base tabular-nums ${
        isLow ? "text-amber-400" : "text-muted-foreground"
      }`}
    >
      ⏱ {mins}:{secs.toString().padStart(2, "0")} remaining
    </p>
  );
}
