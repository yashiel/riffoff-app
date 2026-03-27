"use client";

import { useTransition } from "react";
import {
  Smartphone,
  XCircle,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight,
  Trash2,
  Monitor,
  Globe,
  Clock,
  Fingerprint,
} from "lucide-react";
import { useState } from "react";
import { revokeGateSession, revokeDisconnectedSessions, revokeAllSessions } from "@/actions/gate";
import type { DeviceEntry } from "@/hooks/use-gate-stream";

interface DeviceListProps {
  eventId: string;
  /** Live device list from SSE stream */
  sessions: DeviceEntry[];
  /** Gate names by ID for display */
  gateNames?: Record<string, string>;
}

/**
 * Active scanner devices list — powered by SSE (no polling/fetching).
 * Receives device list from parent CommandCenter via the unified gate stream.
 * Actions (revoke, clean offline, revoke all) still call server actions.
 */
export function DeviceList({ eventId, sessions, gateNames = {} }: DeviceListProps) {
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleRevoke(sessionId: string) {
    startTransition(async () => {
      try {
        await revokeGateSession(eventId, sessionId);
        // SSE will push updated device list automatically
      } catch {
        // Silent
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="flex size-7 items-center justify-center rounded-lg bg-muted">
            <Smartphone className="size-3.5 text-violet-400" />
          </div>
          Devices
          <span className="rounded-full bg-muted px-2 py-0.5 text-sm tabular-nums text-muted-foreground">
            {sessions.length}
          </span>
        </h3>

        {/* Device management buttons */}
        {sessions.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                startTransition(async () => {
                  try {
                    await revokeDisconnectedSessions(eventId);
                    // SSE will push updated list
                  } catch { /* silent */ }
                });
              }}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <Trash2 className="size-3.5" />
              Clean offline
            </button>
            <button
              onClick={() => {
                if (!confirm("Revoke ALL device sessions? All scanners will be disconnected.")) return;
                startTransition(async () => {
                  try {
                    await revokeAllSessions(eventId);
                    // SSE will push empty list
                  } catch { /* silent */ }
                });
              }}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
            >
              <XCircle className="size-3.5" />
              Revoke all
            </button>
          </div>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="mt-3 flex flex-col items-center rounded-2xl border border-dashed border-border py-8 text-center">
          <WifiOff className="size-5 text-muted-foreground/50" />
          <p className="mt-2 text-base text-muted-foreground/70">No active scanners</p>
          <p className="mt-0.5 text-sm text-muted-foreground/50">
            Devices will appear when staff connect
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {sessions.map((session) => {
            const isRecent = session.lastSeenAt
              ? Date.now() - new Date(session.lastSeenAt).getTime() < 300000
              : false;
            const isExpanded = expandedId === session.sessionId;
            const ua = parseUA(session.userAgent);
            const fp = {
              os: ua.os,
              browser: ua.browser,
              screen: session.screenSize || "",
              timezone: session.timezone || "",
              language: session.language || "",
            };
            const gateName = gateNames[session.gateId] || session.gateId;

            return (
              <div
                key={session.sessionId}
                className="overflow-hidden rounded-xl border border-border bg-card transition-colors"
              >
                {/* Device header row */}
                <div className="flex items-center gap-3 px-3.5 py-3">
                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : session.sessionId)}
                    className="rounded-lg p-1 text-muted-foreground/50 hover:text-muted-foreground"
                    aria-label="Show device details"
                  >
                    {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </button>

                  {/* Status indicator */}
                  <div className={`flex size-9 items-center justify-center rounded-xl ${
                    isRecent ? "bg-emerald-400/10" : "bg-amber-400/10"
                  }`}>
                    <Wifi className={`size-4 ${isRecent ? "text-emerald-400" : "text-amber-400"}`} />
                  </div>

                  {/* Device name + gate */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-foreground">
                      {fp.os || "Scanner Device"}
                      {fp.browser ? ` · ${fp.browser}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {gateName !== "default" ? gateName : "Default Gate"}
                      {" · "}
                      {session.lastSeenAt
                        ? isRecent ? "Online" : `Last seen ${new Date(session.lastSeenAt).toLocaleTimeString()}`
                        : "Connecting..."}
                    </p>
                  </div>

                  {/* Revoke */}
                  <button
                    onClick={() => handleRevoke(session.sessionId)}
                    disabled={isPending}
                    aria-label="Disconnect device"
                    className="rounded-lg p-2 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                  >
                    <XCircle className="size-4" />
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/50 px-4 py-3 space-y-2">
                    <DetailRow icon={Monitor} label="Screen" value={fp.screen || "—"} />
                    <DetailRow icon={Globe} label="Language" value={fp.language || "—"} />
                    <DetailRow icon={Clock} label="Timezone" value={fp.timezone || "—"} />
                    <DetailRow icon={Fingerprint} label="Device ID" value={session.deviceId ? `${session.deviceId.slice(0, 16)}...` : "—"} mono />
                    <DetailRow icon={Fingerprint} label="Session" value={session.sessionId.slice(0, 16) + "..."} mono />
                    {session.createdAt && (
                      <DetailRow icon={Clock} label="Connected" value={new Date(session.createdAt).toLocaleString()} />
                    )}
                    {session.issuedBy && (
                      <DetailRow icon={Smartphone} label="Auth" value={session.issuedBy === "pin-auth" ? "PIN Code" : `User ${session.issuedBy.slice(0, 8)}...`} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Smartphone;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5 opacity-50" />
        {label}
      </span>
      <span className={`font-medium text-foreground ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

/** Parse user agent string into OS + browser */
function parseUA(ua?: string): { os: string; browser: string } {
  if (!ua || ua === "unknown") return { os: "", browser: "" };

  let os = "Unknown";
  if (ua.includes("Android")) os = `Android ${ua.match(/Android (\d+[\d.]*)/)?.[1] ?? ""}`.trim();
  else if (ua.includes("iPhone")) os = `iOS ${ua.match(/OS (\d+[_\d]*)/)?.[1]?.replace(/_/g, ".") ?? ""}`.trim();
  else if (ua.includes("iPad")) os = `iPadOS`;
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Linux")) os = "Linux";

  let browser = "";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = `Chrome ${ua.match(/Chrome\/(\d+)/)?.[1] ?? ""}`;
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = `Safari ${ua.match(/Version\/(\d+)/)?.[1] ?? ""}`;
  else if (ua.includes("Firefox")) browser = `Firefox ${ua.match(/Firefox\/(\d+)/)?.[1] ?? ""}`;
  else if (ua.includes("Edg")) browser = `Edge`;

  return { os, browser };
}
