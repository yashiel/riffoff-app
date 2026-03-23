"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { QrCode, ChevronDown, History, BarChart3 } from "lucide-react";
import { QRScanner } from "@/components/features/scanner/QRScanner";
import { ScanResult } from "@/components/features/scanner/ScanResult";
import { ScannerStats } from "@/components/features/scanner/ScannerStats";
import { ScanHistory } from "@/components/features/scanner/ScanHistory";
import {
  validateAndCheckIn,
  getScannerEvents,
  getScannerStats,
  getScanHistory,
  type ScanResult as ScanResultType,
  type ScannerEventStats,
  type ScanHistoryEntry,
} from "@/actions/scanner";

type Tab = "scanner" | "stats" | "history";

export default function ScannerPage() {
  // State
  const [events, setEvents] = useState<ScannerEventStats[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResultType | null>(null);
  const [stats, setStats] = useState<ScannerEventStats | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("scanner");
  const [isPending, startTransition] = useTransition();
  const hasFetchedRef = useRef(false);

  // Load events on mount
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      startTransition(async () => {
        const evts = await getScannerEvents();
        setEvents(evts);
        if (evts.length > 0) {
          setSelectedEventId(evts[0].eventId);
          setStats(evts[0]);
        }
      });
    }
  }, []);

  // Refresh stats when event changes
  useEffect(() => {
    if (!selectedEventId) return;
    startTransition(async () => {
      const [s, h] = await Promise.all([
        getScannerStats(selectedEventId),
        getScanHistory(selectedEventId),
      ]);
      if (s) setStats(s);
      setHistory(h);
    });
  }, [selectedEventId]);

  // Handle QR scan
  const handleScan = useCallback(
    (decodedText: string) => {
      if (!selectedEventId || isPending) return;

      // Pause scanning during validation
      setScanning(false);

      startTransition(async () => {
        const result = await validateAndCheckIn(decodedText, selectedEventId);
        setLastResult(result);

        // Refresh stats after check-in
        if (result.valid) {
          const [s, h] = await Promise.all([
            getScannerStats(selectedEventId),
            getScanHistory(selectedEventId),
          ]);
          if (s) setStats(s);
          setHistory(h);
        }
      });
    },
    [selectedEventId, isPending],
  );

  const dismissResult = useCallback(() => {
    setLastResult(null);
    setScanning(true);
  }, []);



  return (
    <div className="mx-auto max-w-md">
      {/* Header */}
      <div className="flex items-center gap-2">
        <QrCode className="size-5 text-coral" />
        <h1 className="font-display text-[24px]">Scanner</h1>
      </div>

      {/* Event selector */}
      {events.length > 0 && (
        <div className="relative mt-4">
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setLastResult(null);
              setScanning(false);
            }}
            className="w-full appearance-none rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-4 py-3 pr-10 text-[14px] font-medium text-white outline-none focus:border-coral transition-colors"
          >
            {events.map((event) => (
              <option key={event.eventId} value={event.eventId}>
                {event.eventTitle}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      )}

      {events.length === 0 && !isPending && (
        <div className="mt-8 rounded-xl border border-[rgba(255,255,255,0.06)] p-6 text-center">
          <QrCode className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-[14px] text-muted-foreground">
            No active events to scan for. Create and publish an event first.
          </p>
        </div>
      )}

      {/* Tabs */}
      {selectedEventId && (
        <>
          <div className="mt-4 flex gap-1 rounded-xl bg-[rgba(255,255,255,0.03)] p-1">
            {(
              [
                { id: "scanner" as Tab, label: "Scan", icon: QrCode },
                { id: "stats" as Tab, label: "Stats", icon: BarChart3 },
                { id: "history" as Tab, label: "History", icon: History },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-medium uppercase transition-colors ${
                  activeTab === tab.id
                    ? "bg-white/10 text-white"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <tab.icon className="size-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scanner tab */}
          {activeTab === "scanner" && (
            <div className="mt-4 space-y-4">
              {!lastResult && (
                <>
                  <QRScanner onScan={handleScan} scanning={scanning} />
                  <button
                    onClick={() => setScanning(!scanning)}
                    disabled={isPending}
                    className={`w-full rounded-full py-3 text-[14px] font-bold uppercase transition-colors ${
                      scanning
                        ? "bg-red-500 text-white hover:bg-red-400"
                        : "bg-coral text-black hover:bg-coral/90"
                    }`}
                  >
                    {isPending ? "Processing..." : scanning ? "Stop Scanning" : "Start Scanning"}
                  </button>
                </>
              )}

              {lastResult && (
                <ScanResult result={lastResult} onDismiss={dismissResult} />
              )}

              {/* Quick stats below scanner */}
              {stats && (
                <div className="flex items-center justify-center gap-4 text-[13px] text-muted-foreground">
                  <span>
                    <strong className="text-white">{stats.checkedIn}</strong> / {stats.totalTickets} checked in
                  </span>
                  <span className="text-coral">
                    {stats.totalTickets > 0
                      ? Math.round((stats.checkedIn / stats.totalTickets) * 100)
                      : 0}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Stats tab */}
          {activeTab === "stats" && (
            <div className="mt-4">
              {stats ? (
                <ScannerStats stats={stats} />
              ) : (
                <p className="py-8 text-center text-[13px] text-muted-foreground">Loading stats...</p>
              )}
            </div>
          )}

          {/* History tab */}
          {activeTab === "history" && (
            <div className="mt-4">
              <ScanHistory entries={history} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
