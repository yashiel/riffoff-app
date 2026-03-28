"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { Download, Search, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
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
      {eventIdRef.current && (
        <Link
          href={`/dashboard/events/${eventIdRef.current}`}
          className="mb-4 inline-flex items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-coral"
        >
          <ArrowLeft className="size-3.5" />
          Back to event
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl sm:text-[36px]">Attendees</h2>
          <p className="mt-2 text-base text-muted-foreground">
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
      <div className="relative mt-6 w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search by name or ticket code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded bg-[var(--input)] border border-[var(--border)] py-2.5 pl-10 pr-4 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)]"
        />
      </div>

      {/* Table */}
      <div className="mt-8">
        {isPending ? (
          <div className="py-12 text-center text-base text-muted-foreground">Loading attendees...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No attendees yet"
            description="Attendees will appear here when tickets are purchased."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Attendee</th>
                  <th className="hidden pb-3 pr-4 font-medium sm:table-cell">Ticket Code</th>
                  <th className="hidden pb-3 pr-4 font-medium md:table-cell">Tier</th>
                  <th className="hidden pb-3 pr-4 font-medium sm:table-cell">Status</th>
                  <th className="pb-3 font-medium">Checked In</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.ticketId}
                    className="border-b border-[var(--border)] transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                  >
                    <td className="py-3 pr-4">
                      <p className="font-medium text-foreground">{a.attendeeName}</p>
                      {/* Show ticket code + tier inline on mobile */}
                      <p className="mt-0.5 text-sm text-muted-foreground sm:hidden">
                        <span className="font-mono">{a.ticketCode}</span> · {a.tierName}
                      </p>
                    </td>
                    <td className="hidden py-3 pr-4 font-mono text-muted-foreground sm:table-cell">{a.ticketCode}</td>
                    <td className="hidden py-3 pr-4 text-muted-foreground md:table-cell">{a.tierName}</td>
                    <td className="hidden py-3 pr-4 sm:table-cell"><StatusBadge status={a.status} /></td>
                    <td className="py-3">
                      {a.checkedIn ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="size-3.5" />
                          <span className="hidden sm:inline">{a.checkedInAt && formatDate(a.checkedInAt, { timeStyle: "short" })}</span>
                          <span className="sm:hidden">Yes</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <XCircle className="size-3.5" />
                          <span className="hidden sm:inline">Not yet</span>
                          <span className="sm:hidden">No</span>
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
