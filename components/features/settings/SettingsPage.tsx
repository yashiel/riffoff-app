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

const TABS: { id: Tab; label: string; description: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", description: "Profile & preferences", icon: User },
  { id: "security", label: "Security", description: "Password & sessions", icon: Shield },
  { id: "connected", label: "Connected", description: "Linked accounts", icon: Link2 },
  { id: "privacy", label: "Privacy", description: "Data & consent", icon: Eye },
  { id: "danger", label: "Danger Zone", description: "Delete or deactivate", icon: AlertTriangle },
];

interface SettingsPageProps {
  profile: ProfileDoc;
  userEmail: string;
  userHasPassword: boolean;
  providers: LinkedProvider[];
  consents: UserConsentDoc[];
  deletionRequest: DeletionRequestDoc | null;
}

export function SettingsPage({
  profile,
  userEmail,
  userHasPassword,
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
    <div className="flex gap-8 lg:gap-10">
      {/* ─── Vertical side nav ─── */}
      <nav className="hidden w-[200px] shrink-0 md:block">
        <div className="sticky top-8 space-y-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const isDanger = tab.id === "danger";
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                  isActive
                    ? isDanger
                      ? "bg-red-500/[0.08] text-red-400"
                      : "bg-white/[0.05] text-white"
                    : "text-white/40 hover:bg-white/[0.03] hover:text-white/70"
                }`}
              >
                <tab.icon className={`mt-0.5 size-4 shrink-0 transition-colors ${
                  isActive
                    ? isDanger ? "text-red-400" : "text-coral"
                    : "group-hover:text-white/50"
                }`} />
                <div className="min-w-0">
                  <span className="block text-[13px] font-medium leading-tight">{tab.label}</span>
                  <span className={`block text-[11px] leading-tight ${
                    isActive ? "text-white/40" : "text-white/20"
                  }`}>{tab.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ─── Mobile horizontal tabs (shown < md) ─── */}
      <div className="flex w-full flex-col md:hidden">
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-4">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-medium transition-colors ${
                  isActive
                    ? tab.id === "danger"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                <tab.icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1">
          {activeTab === "general" && <GeneralTab profile={profile} userEmail={userEmail} />}
          {activeTab === "security" && <SecurityTab userEmail={userEmail} userHasPassword={userHasPassword} />}
          {activeTab === "connected" && <ConnectedTab providers={providers} />}
          {activeTab === "privacy" && <PrivacyTab consents={consents} />}
          {activeTab === "danger" && <DangerZoneTab deletionRequest={deletionRequest} />}
        </div>
      </div>

      {/* ─── Desktop content panel ─── */}
      <div className="hidden min-w-0 flex-1 md:block">
        {activeTab === "general" && <GeneralTab profile={profile} userEmail={userEmail} />}
        {activeTab === "security" && <SecurityTab userEmail={userEmail} userHasPassword={userHasPassword} />}
        {activeTab === "connected" && <ConnectedTab providers={providers} />}
        {activeTab === "privacy" && <PrivacyTab consents={consents} />}
        {activeTab === "danger" && <DangerZoneTab deletionRequest={deletionRequest} />}
      </div>
    </div>
  );
}
