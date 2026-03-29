"use client";
import { useState, useEffect, useCallback, useRef } from "react";

export interface GateStatEntry {
  gateId: string;
  gateName: string;
  checkedIn: number;
  devices: number;
  conflicts: number;
  lastScan?: string;
}

export interface GateStats {
  total: { checkedIn: number; totalTickets: number };
  gates: GateStatEntry[];
}

export interface FeedEntry {
  id: string;
  ticketCode: string;
  gateName: string;
  status: "valid" | "invalid" | "duplicate";
  timestamp: string;
}

export interface DeviceEntry {
  sessionId: string;
  deviceId: string;
  gateId: string;
  status: string;
  lastSeenAt: string;
  userAgent: string;
  screenSize: string;
  timezone: string;
  language: string;
  deviceFingerprint: string;
  issuedBy: string;
  createdAt: string;
}

export interface BroadcastMessage {
  id: string;
  message: string;
  gateId: string | null;
  createdAt: string;
}

type ConnectionState = "connecting" | "connected" | "reconnecting";

/**
 * Unified SSE hook for the Gate Control dashboard.
 * Connects to /api/gate/stream?role=dashboard&eventId=...
 *
 * Replaces:
 *   - Old use-gate-stream (stats only)
 *   - LiveFeed polling (5s)
 *   - DeviceList one-shot fetch
 */
export function useGateStream(eventId: string) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [stats, setStats] = useState<GateStats | null>(null);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);

  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Polling approach — Vercel serverless can't hold SSE connections.
  // Poll every 5s for stats, feed, devices, broadcasts via a single JSON endpoint.
  const poll = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/gate-stats`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setConnectionState("reconnecting");
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setConnectionState("connected");
      retryCountRef.current = 0;

      if (data.stats) setStats(data.stats);
      if (data.feed) {
        setFeed((prev) => {
          const existing = new Set(prev.map((f) => f.id));
          const newEntries = (data.feed as FeedEntry[]).filter(
            (f) => !existing.has(f.id),
          );
          if (newEntries.length === 0) return prev;
          return [...newEntries, ...prev].slice(0, 50);
        });
      }
      if (data.devices) setDevices(data.devices);
      if (data.broadcasts) {
        setBroadcasts((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const newMsgs = (data.broadcasts as BroadcastMessage[]).filter(
            (m) => !ids.has(m.id),
          );
          if (newMsgs.length === 0) return prev;
          return [...newMsgs, ...prev].slice(0, 20);
        });
      }
    } catch {
      setConnectionState("reconnecting");
      retryCountRef.current++;
    }
  }, [eventId]);

  useEffect(() => {
    // Initial fetch
    poll();

    // Poll every 5s
    const interval = setInterval(poll, 5000);
    const retryTimer = retryTimerRef.current;

    return () => {
      clearInterval(interval);
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [poll]);

  // Backward compat: `connected` boolean
  const connected = connectionState === "connected";

  return { stats, connected, connectionState, feed, devices, broadcasts };
}
