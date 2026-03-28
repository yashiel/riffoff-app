"use client";

import { useGateStream } from "@/hooks/use-gate-stream";
import { GateStatsBar } from "./GateStatsBar";
import { GateCard } from "./GateCard";
import { LiveFeed } from "./LiveFeed";
import { ConflictAlert } from "./ConflictAlert";
import { BroadcastDialog } from "./BroadcastDialog";
import { ExportButton } from "./ExportButton";
import { DeviceList } from "./DeviceList";
import { LayoutGrid } from "lucide-react";

interface GateDoc {
  $id: string;
  name: string;
  status: string;
  capacity: number;
  [key: string]: unknown;
}

interface CommandCenterProps {
  eventId: string;
  gates: GateDoc[];
}

export function CommandCenter({ eventId, gates }: CommandCenterProps) {
  const { stats, connected, feed, devices } = useGateStream(eventId);

  const checkedIn = stats?.total.checkedIn ?? 0;
  const totalTickets = stats?.total.totalTickets ?? 0;

  const conflicts = (stats?.gates ?? [])
    .filter((g) => g.conflicts > 0)
    .map((g) => ({
      gateId: g.gateId,
      gateName: g.gateName,
      conflicts: g.conflicts,
    }));

  // Build gate name lookup for DeviceList
  const gateNameMap: Record<string, string> = {};
  for (const gate of gates) {
    gateNameMap[gate.$id] = gate.name as string;
  }

  return (
    <div className="space-y-8">
      {/* Connection status pill + quick actions */}
      <div className="flex items-center justify-between">
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${
            connected
              ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400"
              : "border-red-400/20 bg-red-400/[0.06] text-red-400"
          }`}
        >
          <span
            className={`inline-block size-1.5 rounded-full ${
              connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
            }`}
          />
          {connected ? "Live — Connected" : "Reconnecting..."}
        </div>

        <div className="flex items-center gap-2">
          <BroadcastDialog eventId={eventId} />
          <ExportButton eventId={eventId} />
        </div>
      </div>

      {/* Stats hero */}
      <GateStatsBar checkedIn={checkedIn} totalTickets={totalTickets} />

      {/* Conflict alerts */}
      {conflicts.length > 0 && <ConflictAlert conflicts={conflicts} />}

      {/* Gates section */}
      <div>
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-muted">
            <LayoutGrid className="size-3.5 text-coral/60" />
          </div>
          <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
            Entry Points
          </h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-sm tabular-nums text-muted-foreground">
            {gates.length}
          </span>
        </div>

        {gates.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-border py-12 text-center">
            <LayoutGrid className="size-6 text-muted-foreground/50" />
            <p className="mt-3 text-base text-muted-foreground/80">No gates configured</p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Add gates from event settings to start scanning
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gates.map((gate) => {
              const live = stats?.gates.find((g) => g.gateId === gate.$id);
              return (
                <GateCard
                  key={gate.$id}
                  gateId={gate.$id}
                  gateName={gate.name as string}
                  status={gate.status as string}
                  checkedIn={live?.checkedIn ?? 0}
                  devices={live?.devices ?? 0}
                  conflicts={live?.conflicts ?? 0}
                  lastScan={live?.lastScan}
                  eventId={eventId}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom: Live Feed + Devices — powered by SSE (no more polling) */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <LiveFeed eventId={eventId} entries={feed} />
        </div>
        <div className="lg:col-span-2">
          <DeviceList eventId={eventId} sessions={devices} gateNames={gateNameMap} />
        </div>
      </div>
    </div>
  );
}
