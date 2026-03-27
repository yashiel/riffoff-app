"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  Pencil,
  Smartphone,
  DoorOpen,
  Shield,
} from "lucide-react";
import { lockGate, unlockGate } from "@/actions/gate";
import { GateForm } from "@/components/features/gate-control/GateForm";
import { AccessCodeGenerator } from "@/components/features/gate-control/AccessCodeGenerator";
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

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; border: string; dot: string; label: string }
> = {
  open: {
    bg: "bg-emerald-400/[0.06]",
    text: "text-emerald-400",
    border: "border-emerald-400/20",
    dot: "bg-emerald-400 animate-pulse",
    label: "Active",
  },
  locked: {
    bg: "bg-amber-400/[0.06]",
    text: "text-amber-400",
    border: "border-amber-400/20",
    dot: "bg-amber-400",
    label: "Locked",
  },
  closed: {
    bg: "bg-red-400/[0.06]",
    text: "text-red-400",
    border: "border-red-400/20",
    dot: "bg-red-400",
    label: "Closed",
  },
};

export function GateList({ eventId, initialGates }: GateListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGateId, setEditingGateId] = useState<string | null>(null);
  const [expandedGateId, setExpandedGateId] = useState<string | null>(null);

  function handleFormSuccess() {
    setShowAddForm(false);
    setEditingGateId(null);
    window.location.reload();
  }

  return (
    <div className="space-y-5">
      {/* Add Gate button */}
      {!showAddForm && (
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingGateId(null);
          }}
          className="group inline-flex items-center gap-2 rounded-xl bg-coral px-5 py-2.5 text-base font-bold text-[#0e0e10] transition-all hover:bg-coral/90 hover:shadow-lg hover:shadow-coral/20 active:scale-[0.98]"
        >
          <Plus className="size-4 transition-transform group-hover:rotate-90" />
          Add Gate
        </button>
      )}

      {/* Add form */}
      {showAddForm && (
        <GateForm
          eventId={eventId}
          onClose={() => setShowAddForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Gate cards */}
      {initialGates.length === 0 && !showAddForm ? (
        <EmptyState
          title="No gates configured"
          description="Add your first gate to enable scanning. Gates let you control entry points and generate access codes for staff."
        />
      ) : (
        <div className="space-y-3">
          {initialGates.map((gate) => (
            <div key={gate.gateId}>
              {editingGateId === gate.gateId ? (
                <GateForm
                  eventId={eventId}
                  gate={gate}
                  onClose={() => setEditingGateId(null)}
                  onSuccess={handleFormSuccess}
                />
              ) : (
                <GateCard
                  gate={gate}
                  eventId={eventId}
                  isExpanded={expandedGateId === gate.gateId}
                  onToggleExpand={() =>
                    setExpandedGateId(
                      expandedGateId === gate.gateId ? null : gate.gateId,
                    )
                  }
                  onEdit={() => {
                    setEditingGateId(gate.gateId);
                    setShowAddForm(false);
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Gate Card ──────────────────────────────────────────

function GateCard({
  gate,
  eventId,
  isExpanded,
  onToggleExpand,
  onEdit,
}: {
  gate: GateData;
  eventId: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const style = STATUS_STYLES[gate.status] ?? STATUS_STYLES.open;

  function handleToggleLock() {
    startTransition(async () => {
      if (gate.status === "locked") {
        await unlockGate(eventId, gate.gateId);
      } else {
        await lockGate(eventId, gate.gateId);
      }
      window.location.reload();
    });
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
        gate.status === "locked"
          ? "border-amber-400/15 bg-amber-400/[0.02]"
          : "border-border bg-muted/60 hover:border-border"
      }`}
    >
      {/* Top accent */}
      <div
        className={`h-0.5 ${
          gate.status === "locked"
            ? "bg-gradient-to-r from-amber-400/40 via-amber-400/20 to-transparent"
            : gate.status === "closed"
              ? "bg-muted"
              : "bg-gradient-to-r from-emerald-400/40 via-emerald-400/20 to-transparent"
        }`}
      />

      {/* Card header */}
      <div className="flex items-center gap-3 p-4 sm:p-5">
        {/* Expand toggle */}
        <button
          onClick={onToggleExpand}
          className="rounded-lg p-1.5 text-muted-foreground/60 transition-all hover:bg-muted hover:text-muted-foreground"
          aria-label={isExpanded ? "Collapse access codes" : "Expand access codes"}
        >
          {isExpanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>

        {/* Gate icon */}
        <div
          className={`flex size-11 items-center justify-center rounded-xl ${
            gate.status === "locked" ? "bg-amber-400/10" : "bg-muted"
          }`}
        >
          <DoorOpen
            className={`size-5 ${
              gate.status === "locked" ? "text-amber-400" : "text-muted-foreground/80"
            }`}
          />
        </div>

        {/* Gate info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base font-semibold text-foreground">
              {gate.name}
            </h3>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}
            >
              <span className={`inline-block size-1.5 rounded-full ${style.dot}`} />
              {style.label}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-base text-muted-foreground/80">
            <span className="flex items-center gap-1.5">
              <Shield className="size-3" />
              {gate.capacity > 0
                ? `${gate.capacity.toLocaleString()} capacity`
                : "Unlimited capacity"}
            </span>
            <span className="flex items-center gap-1.5">
              <Smartphone className="size-3" />
              {gate.activeDevices}
              {gate.maxDevices > 0
                ? ` / ${gate.maxDevices} device${gate.maxDevices !== 1 ? "s" : ""}`
                : ` device${gate.activeDevices !== 1 ? "s" : ""} · unlimited`}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onEdit}
            className="rounded-xl p-2.5 text-muted-foreground/70 transition-all hover:bg-muted hover:text-foreground hover:scale-105"
            aria-label="Edit gate"
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={handleToggleLock}
            disabled={isPending}
            className={`rounded-xl p-2.5 transition-all disabled:opacity-40 hover:scale-105 ${
              gate.status === "locked"
                ? "text-amber-400/60 hover:bg-amber-400/10 hover:text-amber-400"
                : "text-muted-foreground/70 hover:bg-muted hover:text-foreground"
            }`}
            aria-label={gate.status === "locked" ? "Unlock gate" : "Lock gate"}
          >
            {gate.status === "locked" ? (
              <Unlock className="size-4" />
            ) : (
              <Lock className="size-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded: Access Code Generator */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/50 px-5 pb-5 pt-1">
          <AccessCodeGenerator eventId={eventId} gateId={gate.gateId} />
        </div>
      )}
    </div>
  );
}
