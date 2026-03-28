"use client";
export const dynamic = "force-dynamic";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import {
  QrCode,
  History,
  BarChart3,
  Keyboard,
  LogOut,
  Search,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [events, setEvents] = useState<ScannerEventStats[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResultType | null>(null);
  const [stats, setStats] = useState<ScannerEventStats | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("scanner");
  const [isPending, startTransition] = useTransition();
  const [manualCode, setManualCode] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const hasFetchedRef = useRef(false);
  const manualInputRef = useRef<HTMLInputElement>(null);

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
      setScanning(false);

      startTransition(async () => {
        const result = await validateAndCheckIn(decodedText, selectedEventId);
        setLastResult(result);

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
    [selectedEventId, isPending]
  );

  // Handle manual ticket code entry
  const handleManualSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const code = manualCode.trim();
      if (!code || !selectedEventId || isPending) return;

      startTransition(async () => {
        // Try to validate as a ticket token first, then as a ticket code
        const result = await validateAndCheckIn(code, selectedEventId);
        setLastResult(result);
        setManualCode("");
        setShowManualEntry(false);

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
    [manualCode, selectedEventId, isPending]
  );

  const dismissResult = useCallback(() => {
    setLastResult(null);
    setScanning(true);
  }, []);

  // Filtered history
  const filteredHistory = historySearch
    ? history.filter(
        (h) =>
          h.ticketCode.toLowerCase().includes(historySearch.toLowerCase()) ||
          h.attendeeName?.toLowerCase().includes(historySearch.toLowerCase())
      )
    : history;

  return (
    <div className="mx-auto flex max-w-md flex-col" style={{ minHeight: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="size-5 text-coral" />
          <h1 className="font-display text-2xl sm:text-3xl">Scanner</h1>
        </div>
      </div>

      {/* Event selector */}
      {events.length > 0 && (
        <div className="mt-4">
          <Select
            value={selectedEventId}
            onValueChange={(value) => {
              setSelectedEventId(value);
              setLastResult(null);
              setScanning(false);
            }}
          >
            <SelectTrigger className="h-auto w-full rounded-xl border-border bg-input/30 px-4 py-3 text-base font-medium">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {events.map((event) => (
                <SelectItem
                  key={event.eventId}
                  value={event.eventId}
                  className="py-2.5 text-base"
                >
                  {event.eventTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {events.length === 0 && !isPending && (
        <div className="mt-8 rounded-xl border border-border p-6 text-center">
          <QrCode className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-base text-muted-foreground">
            No active events to scan for. Create and publish an event first.
          </p>
        </div>
      )}

      {/* Main content — grows to fill */}
      {selectedEventId && (
        <div className="mt-4 flex flex-1 flex-col">
          {/* Tabs */}
          <div className="flex gap-1 rounded-xl bg-muted p-1">
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
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="size-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scanner tab */}
          {activeTab === "scanner" && (
            <div className="mt-4 flex-1 space-y-4">
              {/* Scanner area — fixed height to prevent layout jump */}
              <div style={{ minHeight: "320px" }}>
                {lastResult ? (
                  <ScanResult result={lastResult} onDismiss={dismissResult} />
                ) : (
                  <>
                    <QRScanner onScan={handleScan} scanning={scanning} />
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setScanning(!scanning)}
                        disabled={isPending}
                        className={`flex-1 rounded-xl py-3 text-sm font-bold uppercase tracking-wide transition-colors ${
                          scanning
                            ? "bg-red-500 text-white hover:bg-red-400"
                            : "bg-coral text-black hover:bg-coral/90"
                        }`}
                      >
                        {isPending
                          ? "Processing..."
                          : scanning
                            ? "Stop"
                            : "Start Scanning"}
                      </button>
                      <button
                        onClick={() => {
                          setShowManualEntry(!showManualEntry);
                          if (!showManualEntry) {
                            setTimeout(
                              () => manualInputRef.current?.focus(),
                              100
                            );
                          }
                        }}
                        className="rounded-xl border border-border bg-card px-4 py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Enter ticket code manually"
                      >
                        <Keyboard className="size-5" />
                      </button>
                    </div>

                    {/* Manual entry */}
                    {showManualEntry && (
                      <form
                        onSubmit={handleManualSubmit}
                        className="mt-3 flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
                      >
                        <input
                          ref={manualInputRef}
                          type="text"
                          value={manualCode}
                          onChange={(e) =>
                            setManualCode(e.target.value.toUpperCase())
                          }
                          placeholder="RIFF-XXXXXX or scan token"
                          className="flex-1 rounded-xl border border-border bg-input px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/15"
                          autoComplete="off"
                          spellCheck={false}
                        />
                        <button
                          type="submit"
                          disabled={!manualCode.trim() || isPending}
                          className="rounded-xl bg-coral px-5 py-3 text-sm font-bold uppercase text-black transition-colors hover:bg-coral/90 disabled:opacity-50"
                        >
                          Check
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>

              {/* Quick stats below scanner */}
              {stats && (
                <div className="flex items-center justify-center gap-4 rounded-xl bg-muted/50 py-3 text-sm text-muted-foreground">
                  <span>
                    <strong className="text-foreground">
                      {stats.checkedIn}
                    </strong>{" "}
                    / {stats.totalTickets} checked in
                  </span>
                  <span className="font-bold text-coral">
                    {stats.totalTickets > 0
                      ? Math.round(
                          (stats.checkedIn / stats.totalTickets) * 100
                        )
                      : 0}
                    %
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
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Loading stats...
                </p>
              )}
            </div>
          )}

          {/* History tab */}
          {activeTab === "history" && (
            <div className="mt-4 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search by ticket code or name"
                  className="w-full rounded-xl border border-border bg-input px-4 py-2.5 pl-10 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-coral/40"
                />
              </div>

              {/* Count */}
              <p className="text-xs text-muted-foreground">
                {filteredHistory.length} scan{filteredHistory.length !== 1 ? "s" : ""}
                {historySearch && ` matching "${historySearch}"`}
              </p>

              <ScanHistory entries={filteredHistory} />
            </div>
          )}
        </div>
      )}

      {/* ─── Sticky footer: Disconnect ─── */}
      {selectedEventId && (
        <div className="sticky bottom-0 mt-6 border-t border-border bg-background pb-4 pt-3">
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Disconnect from this scanner session? You can reconnect later."
                )
              ) {
                window.location.href = "/dashboard";
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400"
          >
            <LogOut className="size-4" />
            Disconnect Scanner
          </button>
        </div>
      )}
    </div>
  );
}
