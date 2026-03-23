import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { getLoggedInUser } from "@/lib/appwrite/server";
import { getProfile, ensureProfile } from "@/actions/profiles";
import { getLinkedProviders } from "@/actions/settings/oauth";
import { getMyConsents } from "@/actions/settings/privacy";
import { getDeletionRequest } from "@/actions/settings/deletion";
import { SettingsPage } from "@/components/features/settings/SettingsPage";
import { serialize } from "@/lib/utils";

export const metadata = { title: "Settings" };

export default async function SettingsRoute() {
  const user = await getLoggedInUser();
  if (!user) redirect("/login");

  // Fetch all data in parallel
  const [profileResult, providers, consents, deletionRequest] = await Promise.all([
    getProfile().then(async (p) => p ?? ensureProfile(user.$id, user.name || undefined)),
    getLinkedProviders(),
    getMyConsents(),
    getDeletionRequest(),
  ]);

  if (!profileResult) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-2">
        <Settings className="size-5 text-coral" />
        <h1 className="font-display text-[28px]">Settings</h1>
      </div>
      <p className="mt-1 text-[14px] text-muted-foreground">
        Manage your account, security, and privacy
      </p>

      <div className="mt-6">
        <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading settings...</div>}>
          <SettingsPage
            profile={serialize(profileResult)}
            userEmail={user.email}
            providers={serialize(providers)}
            consents={serialize(consents)}
            deletionRequest={serialize(deletionRequest)}
          />
        </Suspense>
      </div>
    </div>
  );
}
