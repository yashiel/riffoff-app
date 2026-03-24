"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { Calendar, Ban } from "lucide-react";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import { listAllEvents, adminCancelEvent, type AdminEventRow } from "@/actions/admin";
import { formatDate } from "@/lib/utils";

const STATUS_OPTIONS = ["all", "draft", "published", "cancelled"] as const;

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const hasFetchedRef = useRef(false);

  function fetchEvents(p = page, status = statusFilter) {
    startTransition(async () => {
      const result = await listAllEvents(p, status);
      setEvents(result.events);
      setTotal(result.total);
    });
  }

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchEvents(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCancel(eventId: string, title: string) {
    const reason = prompt(`Reason for cancelling "${title}":`);
    if (!reason) return;
    startTransition(async () => {
      const result = await adminCancelEvent(eventId, reason);
      if (result.error) {
        alert(result.error);
      } else {
        fetchEvents();
      }
    });
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 className="font-display text-[36px]">Event Moderation</h1>
      <p className="mt-2 text-[14px] text-muted-foreground">
        {total} events on the platform
      </p>

      {/* Status filter */}
      <div className="mt-8 flex gap-2">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => { setStatusFilter(status); setPage(1); fetchEvents(1, status); }}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium uppercase transition-colors ${
              statusFilter === status
                ? "bg-white/10 text-white"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.06)] text-left text-muted-foreground">
              <th className="pb-3 pr-4 font-medium">Event</th>
              <th className="pb-3 pr-4 font-medium">Organiser</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium">Date</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr
                key={event.eventId}
                className="border-b border-[rgba(255,255,255,0.03)] transition-colors hover:bg-[rgba(255,255,255,0.02)]"
              >
                <td className="py-3 pr-4">
                  <Link
                    href={`/events/${event.eventId}`}
                    className="font-medium text-white hover:text-coral transition-colors"
                  >
                    {event.title}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{event.organiserName}</td>
                <td className="py-3 pr-4"><StatusBadge status={event.status} /></td>
                <td className="py-3 pr-4 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3 text-coral" />
                    {formatDate(event.startsAt, { dateStyle: "medium" })}
                  </span>
                </td>
                <td className="py-3">
                  {event.status !== "cancelled" && (
                    <button
                      onClick={() => handleCancel(event.eventId, event.title)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/20"
                    >
                      <Ban className="size-3" />
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => { setPage(page - 1); fetchEvents(page - 1); }}
            disabled={page <= 1 || isPending}
            className="btn-ghost !py-1.5 !text-[11px] disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-[13px] text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => { setPage(page + 1); fetchEvents(page + 1); }}
            disabled={page >= totalPages || isPending}
            className="btn-ghost !py-1.5 !text-[11px] disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
