"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { SettingsSection } from "./SettingsSection";
import { updateConsent, exportMyData } from "@/actions/settings/privacy";
import type { ConsentType, UserConsentDoc } from "@/lib/appwrite/types";

interface PrivacyTabProps {
  consents: UserConsentDoc[];
}

const CONSENT_OPTIONS: { type: ConsentType; label: string; description: string }[] = [
  { type: "marketing_email", label: "Marketing emails", description: "Receive event recommendations and promotional offers" },
  { type: "analytics", label: "Usage analytics", description: "Help us improve by sharing anonymous usage data" },
  { type: "third_party_sharing", label: "Third-party sharing", description: "Allow sharing data with event organisers for their events you attend" },
];

export function PrivacyTab({ consents }: PrivacyTabProps) {
  const [isPending, startTransition] = useTransition();
  const [consentState, setConsentState] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const c of consents) map[c.consentType] = c.granted;
    return map;
  });
  const [exportError, setExportError] = useState<string | null>(null);

  function handleToggle(consentType: ConsentType) {
    const newValue = !consentState[consentType];
    setConsentState((prev) => ({ ...prev, [consentType]: newValue }));
    startTransition(async () => {
      const result = await updateConsent(consentType, newValue);
      if (result.error) {
        // Revert on error
        setConsentState((prev) => ({ ...prev, [consentType]: !newValue }));
      }
    });
  }

  function handleExport() {
    setExportError(null);
    startTransition(async () => {
      const result = await exportMyData();
      if (result.error) {
        setExportError(result.error);
        return;
      }
      if (result.data) {
        const blob = new Blob([result.data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `riffoff-data-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  return (
    <div className="space-y-6">
      <SettingsSection title="Data & Privacy" description="Control how your data is used. Changes take effect immediately.">
        <div className="space-y-4">
          {CONSENT_OPTIONS.map((opt) => (
            <label key={opt.type} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentState[opt.type] ?? false}
                onChange={() => handleToggle(opt.type)}
                disabled={isPending}
                className="mt-0.5 size-4 rounded border-[var(--border)] bg-transparent accent-coral"
              />
              <div>
                <p className="text-base font-medium text-foreground">{opt.label}</p>
                <p className="text-base text-muted-foreground">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Export Your Data" description="Download a copy of all your data in JSON format (GDPR Article 20).">
        {exportError && (
          <div role="alert" className="mb-3 rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-base text-red-400">{exportError}</div>
        )}
        <button onClick={handleExport} disabled={isPending}
          className="btn-ghost inline-flex items-center gap-1.5 !py-2 !text-base">
          <Download className="size-3.5" />
          {isPending ? "Preparing..." : "Download my data"}
        </button>
        <p className="mt-2 text-sm text-muted-foreground">Includes: profile, orders, tickets, RSVPs, notifications, and consent records. Limited to once per hour.</p>
      </SettingsSection>
    </div>
  );
}
