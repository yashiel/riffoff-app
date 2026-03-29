"use client";

import { useState, useTransition } from "react";
import { SettingsSection } from "./SettingsSection";
import { unlinkProvider, linkProvider, type LinkedProvider } from "@/actions/settings/oauth";

interface ConnectedTabProps {
  providers: LinkedProvider[];
}

const PROVIDER_INFO: Record<string, { label: string; icon: string; color: string }> = {
  google: { label: "Google", icon: "G", color: "bg-blue-500/20 text-blue-400" },
  facebook: { label: "Facebook", icon: "f", color: "bg-indigo-500/20 text-indigo-400" },
};

const AVAILABLE_PROVIDERS = ["google", "facebook"] as const;

export function ConnectedTab({ providers }: ConnectedTabProps) {
  const [isPending, startTransition] = useTransition();
  const [linkedProviders, setLinkedProviders] = useState(providers);
  const [error, setError] = useState<string | null>(null);

  function handleUnlink(identityId: string) {
    setError(null);
    startTransition(async () => {
      const result = await unlinkProvider(identityId);
      if (result.error) setError(result.error);
      if (result.success) {
        setLinkedProviders((prev) => prev.filter((p) => p.id !== identityId));
      }
    });
  }

  function handleLink(provider: "google" | "facebook") {
    startTransition(async () => {
      await linkProvider(provider);
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-base text-red-400">{error}</div>
      )}

      <SettingsSection title="Connected Accounts" description="Link your social accounts for easier sign-in. Accounts with the same email are automatically linked.">
        <div className="space-y-3">
          {AVAILABLE_PROVIDERS.map((providerKey) => {
            const info = PROVIDER_INFO[providerKey];
            const linked = linkedProviders.find((p) => p.provider === providerKey);

            return (
              <div key={providerKey} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-full text-base font-bold ${info.color}`}>
                    {info.icon}
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground">{info.label}</p>
                    {linked ? (
                      <p className="text-base text-muted-foreground">{linked.providerEmail}</p>
                    ) : (
                      <p className="text-base text-muted-foreground">Not connected</p>
                    )}
                  </div>
                </div>

                {linked ? (
                  <button
                    onClick={() => handleUnlink(linked.id)}
                    disabled={isPending}
                    className="rounded border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-sm font-medium uppercase text-red-400 transition-colors hover:bg-red-500/20"
                  >
                    Unlink
                  </button>
                ) : (
                  <button
                    onClick={() => handleLink(providerKey)}
                    disabled={isPending}
                    className="btn-ghost !py-1.5 !text-sm"
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </SettingsSection>
    </div>
  );
}
