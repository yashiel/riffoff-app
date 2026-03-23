import { redirect } from "next/navigation";
import { getProfile, ensureProfile } from "@/actions/profiles";
import { getLoggedInUser } from "@/lib/appwrite/server";
import { ProfileForm } from "@/components/features/profile/ProfileForm";
import { serialize } from "@/lib/utils";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getLoggedInUser();
  if (!user) redirect("/login");

  let profile = await getProfile();
  if (!profile) {
    try {
      profile = await ensureProfile(user.$id, user.name || undefined);
    } catch (error) {
      console.error("[ProfilePage] Failed to ensure profile:", error);
    }
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="font-display text-[28px]">Profile Setup</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          We couldn&apos;t load your profile. Please try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-[28px]">Profile</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        Manage your account and artist settings
      </p>
      <div className="mt-8">
        <ProfileForm profile={serialize(profile)} />
      </div>
    </div>
  );
}
