"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { User, Shield, Link2, Eye, AlertTriangle } from "lucide-react";
import { GeneralTab } from "./GeneralTab";
import { SecurityTab } from "./SecurityTab";
import { ConnectedTab } from "./ConnectedTab";
import { PrivacyTab } from "./PrivacyTab";
import { DangerZoneTab } from "./DangerZoneTab";
import type { ProfileDoc, UserConsentDoc, DeletionRequestDoc } from "@/lib/appwrite/types";
import type { LinkedProvider } from "@/actions/settings/oauth";

type Tab = "general" | "security" | "connected" | "privacy" | "danger";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "connected", label: "Connected", icon: Link2 },
  { id: "privacy", label: "Privacy", icon: Eye },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];

interface SettingsPageProps {
  profile: ProfileDoc;
  userEmail: string;
  providers: LinkedProvider[];
  consents: UserConsentDoc[];
  deletionRequest: DeletionRequestDoc | null;
}

export function SettingsPage({
  profile,
  userEmail,
  providers,
  consents,
  deletionRequest,
}: SettingsPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") as Tab) || "general";

  function setTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "general") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    router.push(`/dashboard/settings?${params.toString()}`, { scroll: false });
  }

  return (
    <div>
      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto border-b border-[rgba(255,255,255,0.06)] pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors ${
              activeTab === tab.id
                ? tab.id === "danger"
                  ? "border-red-400 text-red-400"
                  : "border-coral text-white"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "general" && <GeneralTab profile={profile} userEmail={userEmail} />}
        {activeTab === "security" && <SecurityTab userEmail={userEmail} />}
        {activeTab === "connected" && <ConnectedTab providers={providers} />}
        {activeTab === "privacy" && <PrivacyTab consents={consents} />}
        {activeTab === "danger" && <DangerZoneTab deletionRequest={deletionRequest} />}
      </div>
    </div>
  );
}
