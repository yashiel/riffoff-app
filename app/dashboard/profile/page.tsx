import { redirect } from "next/navigation";
import { getProfile } from "@/actions/profiles";
import { ProfileForm } from "@/components/features/profile/ProfileForm";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-[28px]">Profile</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        Manage your account and artist settings
      </p>
      <div className="mt-8">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
