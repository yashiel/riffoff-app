export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getLoggedInUser } from "@/lib/appwrite/server";
import { getProfile, ensureProfile } from "@/actions/profiles";
import { getLinkedProviders } from "@/actions/settings/oauth";
import { getMyConsents } from "@/actions/settings/privacy";
import { getDeletionRequest } from "@/actions/settings/deletion";
import { hasPasswordSet } from "@/actions/settings/password";
import { SettingsPage } from "@/components/features/settings/SettingsPage";
import { serialize } from "@/lib/utils";

export const metadata = { title: "Settings" };

export default async function SettingsRoute() {
  const user = await getLoggedInUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const displayCurrency = cookieStore.get("riffoff-currency")?.value || "original";

  const [profileResult, providers, consents, deletionRequest, userHasPassword] = await Promise.all([
    getProfile().then(async (p) => p ?? ensureProfile(user.$id, user.name || undefined)),
    getLinkedProviders(),
    getMyConsents(),
    getDeletionRequest(),
    hasPasswordSet(),
  ]);

  if (!profileResult) redirect("/login");

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-10">
        <h1 className="font-display text-2xl tracking-tight sm:text-3xl lg:text-[40px]">Settings</h1>
        <p className="mt-2 text-base text-muted-foreground/80">
          Manage your account, security, and privacy preferences
        </p>
      </div>

      <Suspense fallback={
        <div className="flex gap-10">
          <div className="hidden w-[200px] shrink-0 md:block">
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/80" />
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted/70" />
            ))}
          </div>
        </div>
      }>
        <SettingsPage
          profile={serialize(profileResult)}
          userEmail={user.email}
          userHasPassword={userHasPassword}
          displayCurrency={displayCurrency}
          providers={serialize(providers)}
          consents={serialize(consents)}
          deletionRequest={serialize(deletionRequest)}
        />
      </Suspense>
    </div>
  );
}
