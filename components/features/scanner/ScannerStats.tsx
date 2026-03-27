import { Users, Ticket, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { ScannerEventStats } from "@/actions/scanner";

interface ScannerStatsProps {
  stats: ScannerEventStats;
}

export function ScannerStats({ stats }: ScannerStatsProps) {
  const percentage =
    stats.totalTickets > 0
      ? Math.round((stats.checkedIn / stats.totalTickets) * 100)
      : 0;

  return (
    <div className="rounded-2xl border border-[var(--border)] p-5">
      <h3 className="font-display text-xl">{stats.eventTitle}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-base text-coral">
        <Clock className="size-3" />
        {formatDate(stats.startsAt, { dateStyle: "medium", timeStyle: "short" })}
      </p>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-end justify-between text-base">
          <span className="text-muted-foreground">Check-in progress</span>
          <span className="font-display text-2xl text-foreground">{percentage}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full bg-coral transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-[var(--border)] p-3">
          <Ticket className="size-4 text-coral" />
          <p className="mt-1 font-display text-xl">{stats.checkedIn}</p>
          <p className="text-sm text-muted-foreground">Checked In</p>
        </div>
        <div className="rounded-xl bg-[var(--border)] p-3">
          <Users className="size-4 text-muted-foreground" />
          <p className="mt-1 font-display text-xl">{stats.totalTickets}</p>
          <p className="text-sm text-muted-foreground">Total Tickets</p>
        </div>
      </div>
    </div>
  );
}
