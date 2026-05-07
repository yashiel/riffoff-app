"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Lock,
  Unlock,
  Pencil,
  Smartphone,
  DoorOpen,
  Shield,
  QrCode,
  Copy,
  Check,
  Download,
  Share2,
  RefreshCw,
  X,
} from "lucide-react";
import QRCodeLib from "qrcode";
import { lockGate, unlockGate, generateAccessQR, generateAccessPIN } from "@/actions/gate";
import { GateForm } from "@/components/features/gate-control/GateForm";
import { EmptyState } from "@/components/features/shared/EmptyState";

interface GateData {
  gateId: string;
  name: string;
  capacity: number;
  maxDevices: number;
  sortOrder: number;
  status: string;
  activeDevices: number;
}

interface GateListProps {
  eventId: string;
  initialGates: GateData[];
}

const STATUS_DOT: Record<string, string> = {
  open: "bg-emerald-400 animate-pulse",
  locked: "bg-amber-400",
  closed: "bg-red-400",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Active",
  locked: "Locked",
  closed: "Closed",
};
const STATUS_TEXT: Record<string, string> = {
  open: "text-emerald-400",
  locked: "text-amber-400",
  closed: "text-red-400",
};

export function GateList({ eventId, initialGates }: GateListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGateId, setEditingGateId] = useState<string | null>(null);
  const [accessGateId, setAccessGateId] = useState<string | null>(null);

  function handleFormSuccess() {
    setShowAddForm(false);
    setEditingGateId(null);
    window.location.reload();
  }

  return (
    <div className="space-y-5">
      {!showAddForm && (
        <button
          onClick={() => { setShowAddForm(true); setEditingGateId(null); }}
          className="group inline-flex items-center gap-2 bg-coral px-5 py-2.5 text-base font-bold text-[#0e0e10] transition-all hover:bg-coral/90 hover:shadow-lg hover:shadow-coral/20 active:scale-[0.98]"
        >
          <Plus className="size-4 transition-transform group-hover:rotate-90" />
          Add Gate
        </button>
      )}

      {showAddForm && (
        <GateForm eventId={eventId} onClose={() => setShowAddForm(false)} onSuccess={handleFormSuccess} />
      )}

      {initialGates.length === 0 && !showAddForm ? (
        <EmptyState
          title="No gates configured"
          description="Add your first gate to enable scanning."
        />
      ) : (
        <div className="space-y-3">
          {initialGates.map((gate) => (
            <div key={gate.gateId}>
              {editingGateId === gate.gateId ? (
                <GateForm eventId={eventId} gate={gate} onClose={() => setEditingGateId(null)} onSuccess={handleFormSuccess} />
              ) : (
                <>
                  <GateRow
                    gate={gate}
                    eventId={eventId}
                    onEdit={() => { setEditingGateId(gate.gateId); setShowAddForm(false); }}
                    onGenerateCode={() => setAccessGateId(accessGateId === gate.gateId ? null : gate.gateId)}
                    showingCodes={accessGateId === gate.gateId}
                  />
                  {accessGateId === gate.gateId && (
                    <AccessPanel
                      eventId={eventId}
                      gate={gate}
                      onClose={() => setAccessGateId(null)}
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Compact Gate Row ──────────────────────────────────

function GateRow({
  gate,
  eventId,
  onEdit,
  onGenerateCode,
  showingCodes,
}: {
  gate: GateData;
  eventId: string;
  onEdit: () => void;
  onGenerateCode: () => void;
  showingCodes: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggleLock() {
    startTransition(async () => {
      if (gate.status === "locked") await unlockGate(eventId, gate.gateId);
      else await lockGate(eventId, gate.gateId);
      window.location.reload();
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3 transition-colors hover:bg-muted/70">
      {/* Icon */}
      <DoorOpen className={`size-5 shrink-0 ${STATUS_TEXT[gate.status] ?? "text-muted-foreground"}`} />

      {/* Name + status */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span className="truncate text-base font-semibold text-foreground">{gate.name}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${STATUS_TEXT[gate.status]} border-current/15`}>
            <span className={`size-1.5 rounded-full ${STATUS_DOT[gate.status]}`} />
            {STATUS_LABEL[gate.status] ?? gate.status}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-4 text-base text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Shield className="size-4" />
            {gate.capacity > 0 ? gate.capacity.toLocaleString() : "∞"} capacity
          </span>
          <span className="flex items-center gap-1.5">
            <Smartphone className="size-4" />
            {gate.activeDevices}{gate.maxDevices > 0 ? `/${gate.maxDevices}` : ""} devices
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onGenerateCode}
          className={`rounded-lg px-3 py-2 text-base font-semibold transition-all ${
            showingCodes
              ? "bg-coral/15 text-coral"
              : "bg-coral/10 text-coral hover:bg-coral/20"
          }`}
        >
          <QrCode className="size-4 sm:hidden" />
          <span className="hidden sm:inline">Access Code</span>
        </button>
        <button
          onClick={handleToggleLock}
          disabled={isPending || gate.status === "closed"}
          className={`rounded-lg p-1.5 transition-all disabled:opacity-30 ${
            gate.status === "locked"
              ? "text-amber-400 hover:bg-amber-400/10"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          aria-label={gate.status === "locked" ? "Unlock" : "Lock"}
        >
          {gate.status === "locked" ? <Unlock className="size-4" /> : <Lock className="size-4" />}
        </button>
        <button
          onClick={onEdit}
          className="rounded-lg p-1.5 text-muted-foreground/50 transition-all hover:bg-muted hover:text-foreground"
          aria-label="Edit"
        >
          <Pencil className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Access Code Panel (slides under the row) ──────────

function AccessPanel({
  eventId,
  gate,
  onClose,
}: {
  eventId: string;
  gate: GateData;
  onClose: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const [qrResult, pinResult] = await Promise.all([
        generateAccessQR(eventId, gate.gateId),
        generateAccessPIN(eventId, gate.gateId),
      ]);
      const dataUrl = await QRCodeLib.toDataURL(qrResult.qrData, {
        width: 240, margin: 3, errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
      setPin(pinResult.pin);
    } catch { /* handled */ }
    setGenerating(false);
  }

  async function handleCopy() {
    if (!pin) return;
    await navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownload() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.download = `${gate.name.replace(/\s+/g, "-").toLowerCase()}-access-qr.png`;
    a.href = qrDataUrl;
    a.click();
  }

  async function handleShare() {
    if (!pin) return;
    const text = `RiffOff Gate Access — ${gate.name}\nPIN: ${pin}\nExpires in 15 min\nOpen scan.riffoff.live`;
    if (navigator.share) {
      try {
        const data: ShareData = { title: `Gate: ${gate.name}`, text };
        if (qrDataUrl) {
          try {
            const blob = await (await fetch(qrDataUrl)).blob();
            data.files = [new File([blob], "gate-qr.png", { type: "image/png" })];
          } catch { /* text only */ }
        }
        await navigator.share(data);
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="ml-8 rounded-b-xl border border-t-0 border-border bg-muted/30 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
      {!qrDataUrl && !pin ? (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="group flex w-full items-center justify-center gap-2 rounded-lg bg-coral/10 border border-coral/20 px-4 py-3 text-base font-bold text-coral transition-all hover:bg-coral/20 disabled:opacity-50"
        >
          <QrCode className={`size-4 ${generating ? "animate-spin" : "group-hover:rotate-12 transition-transform"}`} />
          {generating ? "Generating..." : "Generate QR + PIN"}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* QR */}
          {qrDataUrl && (
            <div className="shrink-0 rounded-xl bg-white p-3 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Access QR" className="size-[200px]" />
            </div>
          )}

          {/* PIN + actions */}
          <div className="flex-1 text-center sm:text-left">
            {pin && (
              <>
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground/60">PIN Code</p>
                <p className="mt-1 font-mono text-4xl font-black tracking-[0.3em] text-foreground">{pin}</p>
              </>
            )}
            <p className="mt-1.5 text-sm text-muted-foreground/50">Expires in 15 min · scan.riffoff.live</p>

            <div className="mt-3 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <button onClick={handleCopy} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground">
                {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button onClick={handleDownload} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground">
                <Download className="size-4" /> Download
              </button>
              <button onClick={handleShare} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground">
                <Share2 className="size-4" /> Share
              </button>
              <button onClick={handleGenerate} disabled={generating} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-base font-medium text-muted-foreground/50 hover:text-coral">
                <RefreshCw className={`size-4 ${generating ? "animate-spin" : ""}`} /> New
              </button>
            </div>
          </div>

          {/* Close */}
          <button onClick={onClose} className="absolute right-6 rounded-md p-1 text-muted-foreground/40 hover:text-foreground sm:relative sm:right-auto">
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
