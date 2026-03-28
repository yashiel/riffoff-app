"use client";
export const dynamic = "force-dynamic";

import { useState, useTransition, useEffect, useRef } from "react";
import { Shield } from "lucide-react";
import { DisputeCard } from "@/components/features/admin/DisputeCard";
import { listDisputes } from "@/actions/disputes";
import type { DisputeDoc, DisputeStatus } from "@/lib/appwrite/types";

const STATUS_OPTIONS = [
  { value: undefined, label: "All" },
  { value: "open" as DisputeStatus, label: "Open" },
  { value: "needs_response" as DisputeStatus, label: "Needs Response" },
  { value: "submitted" as DisputeStatus, label: "Submitted" },
  { value: "won" as DisputeStatus, label: "Won" },
  { value: "lost" as DisputeStatus, label: "Lost" },
] as const;

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<DisputeDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | undefined>(
    undefined,
  );
  const [isPending, startTransition] = useTransition();
  const hasFetchedRef = useRef(false);

  function fetchDisputes(
    p = page,
    status: DisputeStatus | undefined = statusFilter,
  ) {
    startTransition(async () => {
      const result = await listDisputes(status, p);
      if (result) {
        setDisputes(result.disputes);
        setTotal(result.total);
      }
    });
  }

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchDisputes(1, undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl lg:text-[36px]">
        Disputes
      </h1>
      <p className="mt-2 text-base text-muted-foreground">
        {total} dispute{total !== 1 ? "s" : ""} on the platform
      </p>

      {/* Status filter tabs */}
      <div className="mt-6 flex flex-wrap gap-2 sm:mt-8">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.label}
            onClick={() => {
              setStatusFilter(option.value);
              setPage(1);
              fetchDisputes(1, option.value);
            }}
            className={`rounded-full px-3 py-1.5 text-base font-medium transition-colors ${
              statusFilter === option.value
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Dispute list */}
      <div className="mt-8 space-y-3">
        {isPending && disputes.length === 0 && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            Loading disputes...
          </div>
        )}

        {!isPending && disputes.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Shield className="size-10 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              No disputes found
            </p>
            <p className="text-sm text-muted-foreground/70">
              {statusFilter
                ? `No disputes with status "${statusFilter.replace(/_/g, " ")}"`
                : "All clear — no disputes have been filed yet"}
            </p>
          </div>
        )}

        {disputes.map((dispute) => (
          <DisputeCard key={dispute.$id} dispute={dispute} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => {
              setPage(page - 1);
              fetchDisputes(page - 1);
            }}
            disabled={page <= 1 || isPending}
            className="btn-ghost !py-1.5 !text-sm disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-base text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => {
              setPage(page + 1);
              fetchDisputes(page + 1);
            }}
            disabled={page >= totalPages || isPending}
            className="btn-ghost !py-1.5 !text-sm disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
