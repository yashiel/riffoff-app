"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { updateProfile, upgradeRole } from "@/actions/profiles";
import { uploadEventImage } from "@/actions/upload";
import type { ProfileDoc } from "@/lib/appwrite/types";

interface ProfileFormProps {
  profile: ProfileDoc;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl ?? "");
  const [isUploading, setIsUploading] = useState(false);

  const isArtist = profile.role === "artist";
  const isOrganiser = profile.role === "organiser";

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadEventImage(formData);
    if (result.url) setPhotoUrl(result.url);
    if (result.error) setError(result.error);
    setIsUploading(false);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const socialLinksRaw = (formData.get("socialLinks") as string) ?? "";
      const portfolioUrlsRaw = (formData.get("portfolioUrls") as string) ?? "";

      const input = {
        displayName: formData.get("displayName") as string,
        phone: (formData.get("phone") as string) || undefined,
        bio: (formData.get("bio") as string) || undefined,
        artistGenres: (formData.get("artistGenres") as string)
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean),
        socialLinks: socialLinksRaw
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        portfolioUrls: portfolioUrlsRaw
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        photoUrl: photoUrl || undefined,
      };

      const result = await updateProfile(input);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  function handleUpgradeRole(role: "artist" | "organiser") {
    startTransition(async () => {
      const result = await upgradeRole(role);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-8">
      {/* Role upgrade section */}
      {profile.role === "attendee" && (
        <div className="rounded-xl border border-coral/20 bg-coral/5 p-4">
          <h3 className="text-[15px] font-bold text-white">Upgrade Your Account</h3>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Unlock additional features by upgrading your role.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleUpgradeRole("artist")}
              disabled={isPending}
              className="btn-primary !py-2 !text-[12px]"
            >
              Become an Artist
            </button>
            <button
              onClick={() => handleUpgradeRole("organiser")}
              disabled={isPending}
              className="btn-ghost !py-2 !text-[12px]"
            >
              Become an Organiser
            </button>
          </div>
        </div>
      )}

      {/* Profile form */}
      <form action={handleSubmit} className="space-y-6">
        {error && (
          <div role="alert" className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-400">
            Profile updated successfully
          </div>
        )}

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-[#2a2a2a]">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xl font-bold text-coral">
                {(profile.displayName ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <input
              type="file" accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              disabled={isUploading}
              className="text-[13px] text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-[rgba(255,255,255,0.1)] file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-white file:cursor-pointer"
            />
            {isUploading && <p className="mt-1 text-[12px] text-muted-foreground">Uploading...</p>}
          </div>
        </div>

        {/* Display name */}
        <div className="space-y-1.5">
          <Label htmlFor="displayName" className="text-[13px] text-muted-foreground">Display name</Label>
          <input
            id="displayName" name="displayName" required maxLength={100}
            defaultValue={profile.displayName ?? ""}
            className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[rgba(255,255,255,0.3)] transition-colors"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-[13px] text-muted-foreground">Phone (optional)</Label>
          <input
            id="phone" name="phone" type="tel" maxLength={20}
            defaultValue={profile.phone ?? ""}
            className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[rgba(255,255,255,0.3)] transition-colors"
          />
        </div>

        {/* Artist-specific fields */}
        {(isArtist || isOrganiser) && (
          <>
            {/* Bio */}
            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-[13px] text-muted-foreground">Bio</Label>
              <textarea
                id="bio" name="bio" rows={4} maxLength={500}
                defaultValue={profile.bio ?? ""}
                placeholder="Tell people about yourself..."
                className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2.5 text-[14px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)] transition-colors resize-none"
              />
            </div>

            {/* Genres */}
            <div className="space-y-1.5">
              <Label htmlFor="artistGenres" className="text-[13px] text-muted-foreground">Genres (comma-separated)</Label>
              <input
                id="artistGenres" name="artistGenres"
                defaultValue={profile.artistGenres?.join(", ") ?? ""}
                placeholder="e.g. Electronic, Techno, House"
                className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2.5 text-[14px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)] transition-colors"
              />
            </div>

            {/* Social links */}
            <div className="space-y-1.5">
              <Label htmlFor="socialLinks" className="text-[13px] text-muted-foreground">Social links (one per line)</Label>
              <textarea
                id="socialLinks" name="socialLinks" rows={3}
                defaultValue={profile.socialLinks?.join("\n") ?? ""}
                placeholder={"https://instagram.com/yourname\nhttps://soundcloud.com/yourname"}
                className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2.5 text-[14px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)] transition-colors resize-none font-mono text-[13px]"
              />
            </div>

            {/* Portfolio URLs */}
            <div className="space-y-1.5">
              <Label htmlFor="portfolioUrls" className="text-[13px] text-muted-foreground">Portfolio links (one per line)</Label>
              <textarea
                id="portfolioUrls" name="portfolioUrls" rows={3}
                defaultValue={profile.portfolioUrls?.join("\n") ?? ""}
                placeholder={"https://mixcloud.com/yourset\nhttps://youtube.com/watch?v=..."}
                className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2.5 text-[14px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)] transition-colors resize-none font-mono text-[13px]"
              />
            </div>
          </>
        )}

        <button type="submit" disabled={isPending || isUploading} className="btn-primary w-full !py-3">
          {isPending ? "Saving..." : "Update Profile"}
        </button>
      </form>
    </div>
  );
}
