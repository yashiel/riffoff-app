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

  const esRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const url = `/api/gate/stream?role=dashboard&eventId=${encodeURIComponent(eventId)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("connected", () => {
      setConnectionState("connected");
      retryCountRef.current = 0;
    });

    es.addEventListener("stats", (e) => {
      try {
        setStats(JSON.parse(e.data));
      } catch { /* malformed */ }
    });

    es.addEventListener("feed", (e) => {
      try {
        const entries: FeedEntry[] = JSON.parse(e.data);
        setFeed((prev) => {
          const existing = new Set(prev.map((f) => f.id));
          const newEntries = entries.filter((f) => !existing.has(f.id));
          return [...newEntries, ...prev].slice(0, 50);
        });
      } catch { /* malformed */ }
    });

    es.addEventListener("devices", (e) => {
      try {
        setDevices(JSON.parse(e.data));
      } catch { /* malformed */ }
    });

    es.addEventListener("broadcast", (e) => {
      try {
        const msg: BroadcastMessage = JSON.parse(e.data);
        setBroadcasts((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          if (ids.has(msg.id)) return prev;
          return [msg, ...prev].slice(0, 20);
        });
      } catch { /* malformed */ }
    });

    es.onopen = () => {
      setConnectionState("connected");
      retryCountRef.current = 0;
    };

    es.onerror = () => {
      setConnectionState("reconnecting");
      es.close();
      esRef.current = null;

      // Exponential backoff with jitter
      const delay = Math.min(
        1000 * Math.pow(2, retryCountRef.current) + Math.random() * 1000,
        30_000,
      );
      retryCountRef.current++;
      retryTimerRef.current = setTimeout(connect, delay);
    };
  }, [eventId]);

  useEffect(() => {
    connect();

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [connect]);

  // Backward compat: `connected` boolean
  const connected = connectionState === "connected";

  return { stats, connected, connectionState, feed, devices, broadcasts };
}
