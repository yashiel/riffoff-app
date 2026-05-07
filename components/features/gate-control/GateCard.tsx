"use client";

import { useState, useTransition } from "react";
import {
  Lock,
  Unlock,
  Smartphone,
  AlertTriangle,
  Clock,
  DoorOpen,
  ChevronDown,
  Copy,
  Check,
  QrCode,
  Settings2,
  Users,
  Download,
  Share2,
} from "lucide-react";
import QRCodeLib from "qrcode";
import { lockGate, unlockGate, generateAccessPIN, generateAccessQR } from "@/actions/gate";

interface GateCardProps {
  gateId: string;
  gateName: string;
  status: string;
  checkedIn: number;
  devices: number;
  conflicts: number;
  lastScan?: string;
  eventId: string;
  capacity?: number;
  maxDevices?: number;
}

export function GateCard({
  gateId,
  gateName,
  status,
  checkedIn,
  devices,
  conflicts,
  lastScan,
  eventId,
  capacity,
  maxDevices,
}: GateCardProps) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [generatedPIN, setGeneratedPIN] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [, setQrRawData] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const isLocked = status === "locked";
  const isClosed = status === "closed";

  function handleToggleLock(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      if (isLocked) {
        await unlockGate(eventId, gateId);
      } else {
        await lockGate(eventId, gateId);
      }
    });
  }

  async function handleGenerateBoth() {
    setGenerating(true);
    try {
      const [qrResult, pinResult] = await Promise.all([
        generateAccessQR(eventId, gateId),
        generateAccessPIN(eventId, gateId),
      ]);

      // Generate actual QR code image
      const dataUrl = await QRCodeLib.toDataURL(qrResult.qrData, {
        width: 240,
        margin: 3,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#ffffff" },
      });

      setQrDataUrl(dataUrl);
      setQrRawData(qrResult.qrData);
      setGeneratedPIN(pinResult.pin);
    } catch { /* handled */ }
    setGenerating(false);
  }

  async function handleCopyPIN() {
    if (!generatedPIN) return;
    await navigator.clipboard.writeText(generatedPIN);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownloadQR() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `gate-${gateName.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    link.href = qrDataUrl;
    link.click();
  }

  async function handleShare() {
    if (!generatedPIN) return;
    const text = `RiffOff Gate Access — ${gateName}\nPIN: ${generatedPIN}\nExpires in 15 minutes`;
    if (navigator.share) {
      try {
        const items: ShareData = { title: "RiffOff Gate Access", text };
        // Try sharing QR image if supported
        if (qrDataUrl) {
          try {
            const blob = await (await fetch(qrDataUrl)).blob();
            const file = new File([blob], "gate-qr.png", { type: "image/png" });
            items.files = [file];
          } catch { /* fall back to text only */ }
        }
        await navigator.share(items);
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        isLocked
          ? "border-red-400/20 bg-red-400/[0.03]"
          : isClosed
            ? "border-border bg-muted/50 opacity-60"
            : "border-border bg-muted/70 hover:border-coral/20"
      }`}
    >
      {/* Top accent line */}
      <div
        className={`h-0.5 w-full ${
          isLocked
            ? "bg-gradient-to-r from-red-400/60 via-red-400/30 to-transparent"
            : isClosed
              ? "bg-muted"
              : "bg-gradient-to-r from-emerald-400/60 via-emerald-400/30 to-transparent"
        }`}
      />

      {/* Clickable header area */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 rounded-xl"
        aria-expanded={expanded}
        aria-label={`${gateName} gate — click to ${expanded ? "collapse" : "expand"} management options`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 items-center justify-center rounded-xl ${
                isLocked ? "bg-red-400/10" : "bg-muted"
              }`}
            >
              <DoorOpen className={`size-5 ${isLocked ? "text-red-400" : "text-muted-foreground"}`} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{gateName}</h3>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className={`inline-block size-1.5 rounded-full ${
                    isLocked ? "bg-red-400" : isClosed ? "bg-muted" : "bg-emerald-400 animate-pulse"
                  }`}
                />
                <span
                  className={`text-sm font-medium uppercase tracking-wider ${
                    isLocked ? "text-red-400/70" : isClosed ? "text-muted-foreground/80" : "text-emerald-400/70"
                  }`}
                >
                  {status}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              role="button"
              tabIndex={0}
              onClick={handleToggleLock}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleToggleLock(e as unknown as React.MouseEvent); } }}
              aria-label={isLocked ? `Unlock ${gateName}` : `Lock ${gateName}`}
              className={`rounded-xl p-2.5 transition-all duration-200 ${
                isPending || isClosed ? "opacity-40 pointer-events-none" : ""
              } ${
                isLocked
                  ? "bg-red-400/10 text-red-400 hover:bg-red-400/20"
                  : "bg-muted text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {isLocked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
            </div>
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform duration-200 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-muted/80 px-3 py-2.5">
            <p className="text-sm text-muted-foreground/80">Scanned</p>
            <p className="mt-0.5 font-display text-xl tabular-nums text-foreground">{checkedIn}</p>
          </div>
          <div className="rounded-xl bg-muted/80 px-3 py-2.5">
            <div className="flex items-center gap-1">
              <Smartphone className="size-3 text-muted-foreground/80" />
              <p className="text-sm text-muted-foreground/80">Devices</p>
            </div>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{devices}</p>
          </div>
          {conflicts > 0 ? (
            <div className="rounded-xl bg-amber-400/[0.06] px-3 py-2.5">
              <div className="flex items-center gap-1">
                <AlertTriangle className="size-3 text-amber-400" />
                <p className="text-sm text-amber-400/70">Conflicts</p>
              </div>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-amber-400">{conflicts}</p>
            </div>
          ) : (
            <div className="rounded-xl bg-muted/80 px-3 py-2.5">
              <p className="text-sm text-muted-foreground/80">Conflicts</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-400/60">0</p>
            </div>
          )}
        </div>

        {lastScan && (
          <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground/70">
            <Clock className="size-3" />
            <span>Last scan {new Date(lastScan).toLocaleTimeString()}</span>
          </div>
        )}
      </button>

      {/* Expanded management panel */}
      {expanded && (
        <div className="border-t border-border/50 px-4 pb-4 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Quick info */}
          {(capacity || maxDevices) && (
            <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
              {capacity != null && capacity > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  Capacity: {capacity}
                </span>
              )}
              {maxDevices != null && maxDevices > 0 && (
                <span className="flex items-center gap-1.5">
                  <Smartphone className="size-3.5" />
                  Max devices: {maxDevices}
                </span>
              )}
            </div>
          )}

          {/* Generate access code — single button generates both QR + PIN */}
          {!qrDataUrl && !generatedPIN && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleGenerateBoth(); }}
              disabled={generating}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-base font-semibold text-coral transition-all hover:bg-coral/20 disabled:opacity-50"
            >
              <QrCode className={`size-4.5 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Generating..." : "Generate Access Code"}
            </button>
          )}

          {/* Generated QR + PIN display */}
          {(qrDataUrl || generatedPIN) && (
            <div className="space-y-3">
              <div className="flex flex-col items-center rounded-xl border border-coral/20 bg-coral/5 p-4">
                {/* QR Code image */}
                {qrDataUrl && (
                  <div className="rounded-xl bg-white p-3 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="Gate access QR code" className="size-[180px]" />
                  </div>
                )}

                {/* PIN below QR */}
                {generatedPIN && (
                  <div className="mt-3 text-center">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      or enter PIN
                    </p>
                    <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-coral">
                      {generatedPIN}
                    </p>
                  </div>
                )}

                <p className="mt-2 text-xs text-muted-foreground/60">Expires in 15 minutes</p>

                {/* Action buttons */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleCopyPIN(); }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                    {copied ? "Copied!" : "Copy PIN"}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDownloadQR(); }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Download className="size-3.5" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleShare(); }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Share2 className="size-3.5" />
                    Share
                  </button>
                </div>

                {/* Regenerate */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleGenerateBoth(); }}
                  disabled={generating}
                  className="mt-2 text-sm font-medium text-muted-foreground/60 hover:text-muted-foreground transition-colors disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate new code"}
                </button>
              </div>
            </div>
          )}

          {/* Full settings link */}
          <a
            href={`/dashboard/events/${eventId}/gates`}
            onClick={(e) => e.stopPropagation()}
            className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-border bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings2 className="size-3.5" />
            Full Gate Settings
          </a>
        </div>
      )}
    </div>
  );
}
