import { CheckCircle2 } from "lucide-react";
import type { ScanHistoryEntry } from "@/actions/scanner";

interface ScanHistoryProps {
  entries: ScanHistoryEntry[];
}

export function ScanHistory({ entries }: ScanHistoryProps) {
  if (entries.length === 0) {
    return (
      <p className="py-4 text-center text-[13px] text-muted-foreground">
        No check-ins yet. Start scanning to see history.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.ticketId}
          className="flex items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.03)] p-3 text-[13px]"
        >
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-white">{entry.attendeeName}</p>
            <p className="text-muted-foreground">
              {entry.tierName} · {entry.ticketCode}
            </p>
          </div>
          <span className="shrink-0 text-[12px] text-muted-foreground">
            {new Date(entry.checkedInAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
