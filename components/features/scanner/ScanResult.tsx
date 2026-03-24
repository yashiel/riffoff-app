"use client";

import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { ScanResult as ScanResultType } from "@/actions/scanner";

interface ScanResultProps {
  result: ScanResultType;
  onDismiss: () => void;
}

export function ScanResult({ result, onDismiss }: ScanResultProps) {
  if (result.valid) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-400" />
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[20px] text-emerald-400">Checked In</h3>
            <div className="mt-2 space-y-1 text-[14px]">
              <p className="font-bold text-foreground">{result.ticket.attendeeName}</p>
              <p className="text-muted-foreground">
                {result.ticket.tierName} · {result.ticket.ticketCode}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {new Date(result.ticket.checkedInAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="btn-primary mt-4 w-full !bg-emerald-500 !py-2.5 !text-black hover:!bg-emerald-400"
        >
          Scan Next
        </button>
      </div>
    );
  }

  const isWarning = result.code === "ALREADY_CHECKED_IN";
  const Icon = isWarning ? AlertCircle : XCircle;
  const borderColor = isWarning ? "border-amber-500/20" : "border-red-500/20";
  const bgColor = isWarning ? "bg-amber-500/10" : "bg-red-500/10";
  const textColor = isWarning ? "text-amber-400" : "text-red-400";

  return (
    <div className={`animate-in fade-in slide-in-from-bottom-4 rounded-2xl border ${borderColor} ${bgColor} p-6`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-6 shrink-0 ${textColor}`} />
        <div>
          <h3 className={`font-display text-[20px] ${textColor}`}>
            {isWarning ? "Already Scanned" : "Invalid Ticket"}
          </h3>
          <p className="mt-2 text-[14px] text-muted-foreground">{result.reason}</p>
          <p className="mt-1 text-[12px] uppercase text-muted-foreground">{result.code}</p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className={`mt-4 w-full rounded-full py-2.5 text-[12px] font-bold uppercase ${
          isWarning
            ? "bg-amber-500 text-black hover:bg-amber-400"
            : "bg-red-500 text-white hover:bg-red-400"
        } transition-colors`}
      >
        Try Again
      </button>
    </div>
  );
}
