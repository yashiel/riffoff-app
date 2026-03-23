"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Download, Search, CheckCircle2, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import { EmptyState } from "@/components/features/shared/EmptyState";
import { getEventAttendees, exportAttendeesCSV, type AttendeeRow } from "@/actions/attendees";
import { formatDate } from "@/lib/utils";

interface AttendeesPageProps {
  params: Promise<{ eventId: string }>;
}

export default function AttendeesPage({ params }: AttendeesPageProps) {
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isExporting, startExport] = useTransition();
  const hasFetchedRef = useRef(false);
  const eventIdRef = useRef<string>("");

  // Fetch attendees on mount
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      params.then(({ eventId }) => {
        eventIdRef.current = eventId;
        startTransition(async () => {
          const data = await getEventAttendees(eventId);
          setAttendees(data);
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleExport() {
    startExport(async () => {
      const csv = await exportAttendeesCSV(eventIdRef.current);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendees-${eventIdRef.current}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const filtered = search
    ? attendees.filter(
        (a) =>
          a.attendeeName.toLowerCase().includes(search.toLowerCase()) ||
          a.ticketCode.toLowerCase().includes(search.toLowerCase()),
      )
    : attendees;

  const checkedInCount = attendees.filter((a) => a.checkedIn).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-[24px]">Attendees</h2>
          <p className="mt-1 text-[14px] text-muted-foreground">
            {attendees.length} tickets · {checkedInCount} checked in
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting || attendees.length === 0}
          className="btn-ghost inline-flex items-center gap-1.5"
        >
          <Download className="size-3.5" />
          {isExporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {/* Search */}
      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search by name or ticket code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] py-2.5 pl-10 pr-4 text-[14px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)]"
        />
      </div>

      {/* Table */}
      <div className="mt-6">
        {isPending ? (
          <div className="py-12 text-center text-[14px] text-muted-foreground">Loading attendees...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No attendees yet"
            description="Attendees will appear here when tickets are purchased."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)] text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Attendee</th>
                  <th className="pb-3 pr-4 font-medium">Ticket Code</th>
                  <th className="pb-3 pr-4 font-medium">Tier</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Checked In</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.ticketId}
                    className="border-b border-[rgba(255,255,255,0.03)] transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                  >
                    <td className="py-3 pr-4 font-medium text-white">{a.attendeeName}</td>
                    <td className="py-3 pr-4 font-mono text-white/60">{a.ticketCode}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{a.tierName}</td>
                    <td className="py-3 pr-4"><StatusBadge status={a.status} /></td>
                    <td className="py-3">
                      {a.checkedIn ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="size-3.5" />
                          {a.checkedInAt && formatDate(a.checkedInAt, { timeStyle: "short" })}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <XCircle className="size-3.5" />
                          Not yet
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
