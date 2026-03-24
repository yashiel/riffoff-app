"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { ScrollText } from "lucide-react";
import { getAuditLogs } from "@/actions/admin";
import { formatDate } from "@/lib/utils";
import type { AuditLogDoc } from "@/lib/appwrite/types";

const ACTION_COLORS: Record<string, string> = {
  "event.published": "text-emerald-400",
  "event.cancelled": "text-red-400",
  "admin.role_change": "text-amber-400",
  "admin.event_cancelled": "text-red-400",
  "application.submitted": "text-blue-400",
  "application.accepted": "text-emerald-400",
  "application.rejected": "text-red-400",
  "application.shortlisted": "text-amber-400",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const hasFetchedRef = useRef(false);

  function fetchLogs(p = page) {
    startTransition(async () => {
      const result = await getAuditLogs(p);
      setLogs(result.logs);
      setTotal(result.total);
    });
  }

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchLogs(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.ceil(total / 30);

  return (
    <div>
      <div className="flex items-center gap-2">
        <ScrollText className="size-5 text-coral" />
        <h1 className="font-display text-[36px]">Audit Log</h1>
      </div>
      <p className="mt-2 text-[14px] text-muted-foreground">
        {total} recorded actions
      </p>

      <div className="mt-8 space-y-2">
        {logs.length === 0 && !isPending && (
          <p className="py-8 text-center text-[13px] text-muted-foreground">No audit entries yet.</p>
        )}

        {logs.map((log) => {
          const color = ACTION_COLORS[log.action] ?? "text-muted-foreground";
          let metadata: Record<string, unknown> = {};
          try {
            if (log.metadata) metadata = JSON.parse(log.metadata);
          } catch { /* ignore */ }

          return (
            <div
              key={log.$id}
              className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-3 text-[13px]"
            >
              <div className={`mt-0.5 shrink-0 font-mono text-[11px] font-bold uppercase ${color}`}>
                {log.action.replace(/\./g, " · ")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {log.entityType}/{log.entityId.slice(0, 8)}...
                  </span>
                  {typeof metadata.reason === "string" && (
                    <span className="text-muted-foreground/60">
                      — {metadata.reason.slice(0, 60)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                  by {log.actorId?.slice(0, 8) ?? "system"}... · {formatDate(log.$createdAt, { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => { setPage(page - 1); fetchLogs(page - 1); }}
            disabled={page <= 1 || isPending}
            className="btn-ghost !py-1.5 !text-[11px] disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-[13px] text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => { setPage(page + 1); fetchLogs(page + 1); }}
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
