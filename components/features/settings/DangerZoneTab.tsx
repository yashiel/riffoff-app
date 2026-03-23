"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { SettingsSection } from "./SettingsSection";
import { ConfirmDialog } from "./ConfirmDialog";
import { deactivateAccount } from "@/actions/settings/deactivate";
import { requestAccountDeletion, cancelAccountDeletion } from "@/actions/settings/deletion";
import type { DeletionRequestDoc } from "@/lib/appwrite/types";

interface DangerZoneTabProps {
  deletionRequest: DeletionRequestDoc | null;
}

export function DangerZoneTab({ deletionRequest }: DangerZoneTabProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeDeletion, setActiveDeletion] = useState(deletionRequest);

  function handleDeactivate() {
    startTransition(async () => {
      const result = await deactivateAccount();
      if (result.error) setError(result.error);
    });
  }

  function handleRequestDeletion() {
    setError(null);
    startTransition(async () => {
      const result = await requestAccountDeletion();
      if (result.error) setError(result.error);
      if (result.success) {
        // Refresh deletion request state
        window.location.reload();
      }
    });
  }

  function handleCancelDeletion() {
    startTransition(async () => {
      const result = await cancelAccountDeletion();
      if (result.error) setError(result.error);
      if (result.success) setActiveDeletion(null);
    });
  }

  const daysRemaining = activeDeletion
    ? Math.max(0, Math.ceil((new Date(activeDeletion.scheduledDeleteAt).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">{error}</div>
      )}

      {/* Active deletion request banner */}
      {activeDeletion && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-5 text-amber-400" />
            <div>
              <h3 className="text-[15px] font-bold text-amber-400">Account Deletion Scheduled</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Your account will be permanently deleted in <strong className="text-white">{daysRemaining} days</strong> ({new Date(activeDeletion.scheduledDeleteAt).toLocaleDateString()}).
                All data will be irreversibly removed.
              </p>
              <button
                onClick={handleCancelDeletion}
                disabled={isPending}
                className="mt-3 rounded bg-amber-500 px-4 py-2 text-[12px] font-bold uppercase text-black transition-colors hover:bg-amber-400"
              >
                {isPending ? "Cancelling..." : "Cancel Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate */}
      <SettingsSection title="Deactivate Account" description="Temporarily hide your profile. You can reactivate by signing in again." danger>
        <ConfirmDialog
          trigger={
            <button className="rounded border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[12px] font-medium uppercase text-amber-400 transition-colors hover:bg-amber-500/20">
              Deactivate Account
            </button>
          }
          title="Deactivate your account?"
          description="Your profile will be hidden and you'll be logged out of all devices. You can reactivate by signing in again."
          confirmText="Deactivate"
          onConfirm={handleDeactivate}
          disabled={isPending}
        />
      </SettingsSection>

      {/* Delete */}
      {!activeDeletion && (
        <SettingsSection title="Delete Account" description="Permanently delete your account and all associated data. This action has a 30-day grace period." danger>
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg bg-red-500/5 p-3 text-[12px] text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" />
              <div>
                <p>After requesting deletion:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  <li>Your account enters a <strong className="text-white">30-day grace period</strong></li>
                  <li>You can cancel during this period from Settings</li>
                  <li>After 30 days, all data is <strong className="text-red-400">permanently and irreversibly deleted</strong></li>
                  <li>This includes tickets, orders, applications, and profile data</li>
                </ul>
                <p className="mt-2">We recommend <a href="/dashboard/settings?tab=privacy" className="text-coral hover:underline">downloading your data</a> before requesting deletion.</p>
              </div>
            </div>

            <ConfirmDialog
              trigger={
                <button className="rounded bg-red-500 px-4 py-2 text-[12px] font-bold uppercase text-white transition-colors hover:bg-red-400">
                  Request Account Deletion
                </button>
              }
              title="Delete your account?"
              description="Type DELETE below to confirm. Your account will be scheduled for permanent deletion in 30 days."
              confirmText="Delete Account"
              typeToConfirm="DELETE"
              danger
              onConfirm={handleRequestDeletion}
              disabled={isPending}
            />
          </div>
        </SettingsSection>
      )}
    </div>
  );
}
