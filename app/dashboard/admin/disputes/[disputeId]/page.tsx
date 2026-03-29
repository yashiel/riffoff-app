"use client";
export const dynamic = "force-dynamic";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  AlertTriangle,
  Clock,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import {
  getDisputeDetail,
  uploadDisputeEvidence,
  submitDisputeEvidence,
  acceptDisputeLoss,
  type DisputeDetail,
} from "@/actions/disputes";
import { getAuditLogs, type AuditLogRow } from "@/actions/admin";
import { formatDate, formatRelativeTime, formatCentsToDisplay } from "@/lib/utils";

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  paypal: "PayPal",
  tng: "TNG eWallet",
};

export default function DisputeDetailPage({
  params,
}: {
  params: Promise<{ disputeId: string }>;
}) {
  const [detail, setDetail] = useState<DisputeDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [evidenceText, setEvidenceText] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<
    { fileId: string; url: string }[]
  >([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const [resolvedParams, setResolvedParams] = useState<{
    disputeId: string;
  } | null>(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (!resolvedParams || hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    startTransition(async () => {
      const [disputeResult, logsResult] = await Promise.all([
        getDisputeDetail(resolvedParams.disputeId),
        getAuditLogs(1, "admin.dispute"),
      ]);

      setDetail(disputeResult);

      // Filter audit logs to those related to this dispute or its order
      if (disputeResult && logsResult.logs.length > 0) {
        const relevantLogs = logsResult.logs.filter(
          (log) =>
            log.entityId === resolvedParams.disputeId ||
            log.entityId === disputeResult.order.$id,
        );
        setAuditLogs(relevantLogs);
      }
    });
  }, [resolvedParams]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !resolvedParams) return;

    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadDisputeEvidence(
        resolvedParams.disputeId,
        formData,
      );
      if (result) {
        setUploadedFiles((prev) => [...prev, result]);
        setSuccess("File uploaded successfully");
      } else {
        setError("Failed to upload file");
      }
    });

    // Reset input
    e.target.value = "";
  }

  function handleSubmitEvidence() {
    if (!resolvedParams || !evidenceText.trim()) return;

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const ok = await submitDisputeEvidence(
        resolvedParams.disputeId,
        evidenceText,
      );
      if (ok) {
        setSuccess("Evidence submitted successfully");
        // Refresh detail
        const updated = await getDisputeDetail(resolvedParams.disputeId);
        setDetail(updated);
      } else {
        setError("Failed to submit evidence");
      }
    });
  }

  function handleAcceptLoss() {
    if (!resolvedParams) return;

    const confirmed = confirm(
      "Are you sure you want to accept this dispute loss? This will process a refund for the order.",
    );
    if (!confirmed) return;

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await acceptDisputeLoss(resolvedParams.disputeId);
      if (result.success) {
        setSuccess("Dispute loss accepted and refund processed");
        const updated = await getDisputeDetail(resolvedParams.disputeId);
        setDetail(updated);
      } else {
        setError(result.error ?? "Failed to accept dispute loss");
      }
    });
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        {isPending ? "Loading dispute details..." : "Dispute not found"}
      </div>
    );
  }

  const { dispute, order, customerName, customerEmail, eventTitle } = detail;
  const isActionable =
    dispute.status === "open" || dispute.status === "needs_response";
  const isResolved = dispute.status === "won" || dispute.status === "lost";

  // Deadline calculation
  const deadlineApproaching =
    dispute.deadlineAt &&
    isActionable &&
    new Date(dispute.deadlineAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000; // 3 days

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/admin/disputes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to Disputes
      </Link>

      {/* Header */}
      <div className="mt-6 flex flex-wrap items-start gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">
          Dispute #{dispute.$id.slice(-8)}
        </h1>
        <div className="flex items-center gap-2">
          <StatusBadge status={dispute.status} />
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {PROVIDER_LABELS[dispute.provider] ?? dispute.provider}
          </span>
        </div>
      </div>

      {/* Deadline warning */}
      {deadlineApproaching && dispute.deadlineAt && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            Response deadline: {formatRelativeTime(dispute.deadlineAt)} (
            {formatDate(dispute.deadlineAt, { dateStyle: "medium" })})
          </span>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Left column — Dispute + Order info */}
        <div className="space-y-6">
          {/* Dispute info */}
          <div className="rounded-xl border border-[var(--border)] bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CreditCard className="size-4 text-coral" />
              Dispute Details
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-medium">
                  {formatCentsToDisplay(dispute.amount, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Reason</dt>
                <dd className="capitalize">
                  {dispute.reason?.replace(/_/g, " ") ?? "Not specified"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Provider Case ID</dt>
                <dd className="font-mono text-xs">{dispute.providerCaseId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Opened</dt>
                <dd>{formatDate(dispute.openedAt)}</dd>
              </div>
              {dispute.deadlineAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Deadline</dt>
                  <dd
                    className={
                      deadlineApproaching ? "font-medium text-amber-400" : ""
                    }
                  >
                    {formatDate(dispute.deadlineAt, { dateStyle: "medium" })}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Order info */}
          <div className="rounded-xl border border-[var(--border)] bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <FileText className="size-4 text-coral" />
              Order Information
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Order ID</dt>
                <dd className="font-mono text-xs">{order.$id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Customer</dt>
                <dd>{customerName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Email</dt>
                <dd>{customerEmail}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Event</dt>
                <dd className="max-w-[200px] truncate text-right">
                  {eventTitle}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Order Status</dt>
                <dd>
                  <StatusBadge status={order.status} />
                </dd>
              </div>
              {order.paidAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Paid</dt>
                  <dd>{formatDate(order.paidAt)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Right column — Evidence + Actions */}
        <div className="space-y-6">
          {/* Evidence section */}
          {isActionable && (
            <div className="rounded-xl border border-[var(--border)] bg-card p-5">
              <h2 className="text-lg font-semibold">Submit Evidence</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload supporting documents and provide a written response to
                contest this dispute.
              </p>

              {/* File upload */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-muted-foreground">
                  Upload files
                </label>
                <label
                  className={`mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border)] px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-coral/50 hover:text-foreground ${isPending ? "pointer-events-none opacity-50" : ""}`}
                >
                  <Upload className="size-4" />
                  <span>Choose file to upload</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileUpload}
                    disabled={isPending}
                  />
                </label>
                {uploadedFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {uploadedFiles.map((f) => (
                      <li
                        key={f.fileId}
                        className="flex items-center gap-2 text-sm text-emerald-400"
                      >
                        <CheckCircle className="size-3.5" />
                        File uploaded (ID: {f.fileId.slice(-8)})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Evidence text */}
              <div className="mt-4">
                <label
                  htmlFor="evidence-text"
                  className="block text-sm font-medium text-muted-foreground"
                >
                  Evidence statement
                </label>
                <textarea
                  id="evidence-text"
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  placeholder="Describe the evidence supporting your case. Include details about the transaction, delivery, and any communication with the customer."
                  rows={6}
                  className="mt-2 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-coral/50 focus:outline-none focus:ring-1 focus:ring-coral/50"
                  disabled={isPending}
                />
              </div>

              <button
                onClick={handleSubmitEvidence}
                disabled={isPending || !evidenceText.trim()}
                className="mt-4 w-full bg-coral px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral/90 disabled:opacity-50"
              >
                {isPending ? "Submitting..." : "Submit Evidence"}
              </button>
            </div>
          )}

          {/* Resolution status */}
          {isResolved && (
            <div className="rounded-xl border border-[var(--border)] bg-card p-5">
              <div className="flex items-center gap-3">
                {dispute.status === "won" ? (
                  <CheckCircle className="size-8 text-emerald-400" />
                ) : (
                  <XCircle className="size-8 text-red-400" />
                )}
                <div>
                  <h2 className="text-lg font-semibold">
                    Dispute {dispute.status === "won" ? "Won" : "Lost"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {dispute.status === "won"
                      ? "The dispute was resolved in your favour. Funds have been returned."
                      : "The dispute was resolved in the customer's favour."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Accept loss action */}
          {isActionable && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
              <h2 className="text-lg font-semibold text-red-400">
                Accept Loss
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Accept the dispute and process a full refund. This action cannot
                be undone.
              </p>
              <button
                onClick={handleAcceptLoss}
                disabled={isPending}
                className="mt-4 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                {isPending ? "Processing..." : "Accept Loss & Refund"}
              </button>
            </div>
          )}

          {/* Audit log timeline */}
          <div className="rounded-xl border border-[var(--border)] bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="size-4 text-coral" />
              Activity Timeline
            </h2>
            {auditLogs.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No activity recorded yet
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {auditLogs.map((log) => {
                  let meta: Record<string, unknown> = {};
                  try {
                    meta = log.metadata ? JSON.parse(log.metadata) : {};
                  } catch {
                    // ignore parse errors
                  }

                  return (
                    <li
                      key={log.id}
                      className="border-l-2 border-[var(--border)] pl-4 text-sm"
                    >
                      <p className="font-medium">
                        {log.action.replace(/\./g, " > ").replace(/_/g, " ")}
                      </p>
                      {typeof meta.actorName === "string" && (
                        <p className="text-muted-foreground">
                          by {meta.actorName}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/70">
                        {formatDate(log.createdAt)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
