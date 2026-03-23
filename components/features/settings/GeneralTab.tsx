"use client";

import { useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SettingsSection } from "./SettingsSection";
import { updateGeneralProfile, uploadAvatar, deleteAvatar } from "@/actions/settings/profile";
import { upgradeRole } from "@/actions/profiles";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import type { ProfileDoc } from "@/lib/appwrite/types";

interface GeneralTabProps {
  profile: ProfileDoc;
  userEmail: string;
  currentCurrency?: string;
}

const TIMEZONES = [
  "UTC", "Asia/Kuala_Lumpur", "Asia/Singapore", "Asia/Tokyo", "Asia/Shanghai",
  "Asia/Kolkata", "Europe/London", "Europe/Berlin", "Europe/Paris",
  "America/New_York", "America/Chicago", "America/Los_Angeles", "Australia/Sydney",
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "zh", label: "中文" },
  { code: "ta", label: "தமிழ்" },
];

export function GeneralTab({ profile, userEmail, currentCurrency = "original" }: GeneralTabProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl ?? "");
  const [isUploading, setIsUploading] = useState(false);

  const role = profile.role;
  const showBio = role === "artist" || role === "organiser";
  const showGenres = role === "artist";
  const showSocialLinks = role === "artist" || role === "organiser";
  const showPortfolio = role === "artist";

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadAvatar(formData);
    if (result.url) setPhotoUrl(result.url);
    if (result.error) setError(result.error);
    setIsUploading(false);
  }

  function handleDeleteAvatar() {
    startTransition(async () => {
      const result = await deleteAvatar();
      if (result.success) setPhotoUrl("");
      if (result.error) setError(result.error);
    });
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const input: Parameters<typeof updateGeneralProfile>[0] = {
        displayName: formData.get("displayName") as string,
        phone: (formData.get("phone") as string) || undefined,
        timezone: (formData.get("timezone") as string) || undefined,
        language: (formData.get("language") as string) || undefined,
      };

      // Only include role-specific fields if they exist in the form
      if (showBio) {
        input.bio = (formData.get("bio") as string) || undefined;
      }
      if (showGenres) {
        input.artistGenres = (formData.get("artistGenres") as string)
          .split(",").map((g) => g.trim()).filter(Boolean);
      }
      if (showSocialLinks) {
        input.socialLinks = (formData.get("socialLinks") as string)
          .split("\n").map((s) => s.trim()).filter(Boolean);
      }
      if (showPortfolio) {
        input.portfolioUrls = (formData.get("portfolioUrls") as string)
          .split("\n").map((s) => s.trim()).filter(Boolean);
      }

      const result = await updateGeneralProfile(input);

      // Sync currency cookie with settings preference
      const currency = formData.get("currency") as string;
      if (currency) {
        document.cookie = `riffoff-currency=${currency};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
      }

      if (result.error) setError(result.error);
      if (result.success) { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
    });
  }

  function handleUpgradeRole(role: "artist" | "organiser") {
    startTransition(async () => {
      const result = await upgradeRole(role);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">{error}</div>
      )}
      {success && (
        <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-400">Profile updated</div>
      )}

      {/* Role upgrade */}
      {profile.role === "attendee" && (
        <SettingsSection title="Upgrade Account" description="Unlock additional features by upgrading your role.">
          <div className="flex gap-2">
            <button onClick={() => handleUpgradeRole("artist")} disabled={isPending} className="btn-primary !py-2 !text-[12px]">Become an Artist</button>
            <button onClick={() => handleUpgradeRole("organiser")} disabled={isPending} className="btn-ghost !py-2 !text-[12px]">Become an Organiser</button>
          </div>
        </SettingsSection>
      )}

      {/* Avatar */}
      <SettingsSection title="Profile Photo">
        <div className="flex items-center gap-4">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-[#2a2a2a]">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl font-bold text-coral">
                {(profile.displayName ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="btn-ghost inline-flex cursor-pointer items-center gap-1.5 !py-1.5 !text-[11px]">
              <Camera className="size-3" />
              {isUploading ? "Uploading..." : "Upload photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} disabled={isUploading} className="hidden" />
            </label>
            {photoUrl && (
              <button onClick={handleDeleteAvatar} disabled={isPending} className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300">
                <Trash2 className="size-3" /> Remove
              </button>
            )}
            <p className="text-[11px] text-muted-foreground">JPEG, PNG, or WebP. Max 2MB.</p>
          </div>
        </div>
      </SettingsSection>

      {/* Profile info form */}
      <SettingsSection title="Profile Information">
        <form action={handleSubmit} className="space-y-4">
          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">Email</Label>
            <div className="flex items-center gap-2">
              <p className="text-[14px] text-white">{userEmail}</p>
              <a href="/dashboard/settings?tab=security" className="text-[11px] text-coral hover:underline">Change</a>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-[12px] text-muted-foreground">Display name</Label>
              <input id="displayName" name="displayName" required maxLength={100} defaultValue={profile.displayName ?? ""}
                className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[14px] text-white outline-none focus:border-[rgba(255,255,255,0.3)]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-[12px] text-muted-foreground">Phone (optional)</Label>
              <input id="phone" name="phone" type="tel" maxLength={20} defaultValue={profile.phone ?? ""}
                className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[14px] text-white outline-none focus:border-[rgba(255,255,255,0.3)]" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="timezone" className="text-[12px] text-muted-foreground">Timezone</Label>
              <select id="timezone" name="timezone" defaultValue={profile.timezone ?? "UTC"}
                className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[14px] text-white outline-none">
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="language" className="text-[12px] text-muted-foreground">Language</Label>
              <select id="language" name="language" defaultValue={profile.language ?? "en"}
                className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[14px] text-white outline-none">
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency" className="text-[12px] text-muted-foreground">Display currency</Label>
              <select id="currency" name="currency" defaultValue={currentCurrency}
                className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[14px] text-white outline-none">
                <option value="original">🌐 Original</option>
                {SUPPORTED_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Bio — artists & organisers */}
          {showBio && (
            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-[12px] text-muted-foreground">
                {role === "organiser" ? "About your organisation" : "Bio"}
              </Label>
              <textarea id="bio" name="bio" rows={3} maxLength={500} defaultValue={profile.bio ?? ""}
                placeholder={role === "organiser" ? "Tell people about your organisation..." : "Tell people about yourself..."}
                className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[14px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)] resize-none" />
            </div>
          )}

          {/* Genres — artists only */}
          {showGenres && (
            <div className="space-y-1.5">
              <Label htmlFor="artistGenres" className="text-[12px] text-muted-foreground">Genres (comma-separated)</Label>
              <input id="artistGenres" name="artistGenres" defaultValue={profile.artistGenres?.join(", ") ?? ""}
                placeholder="Electronic, Techno, House"
                className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[14px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)]" />
            </div>
          )}

          {/* Social links — artists & organisers */}
          {showSocialLinks && (
            <div className="space-y-1.5">
              <Label htmlFor="socialLinks" className="text-[12px] text-muted-foreground">Social links (one per line)</Label>
              <textarea id="socialLinks" name="socialLinks" rows={2} defaultValue={profile.socialLinks?.join("\n") ?? ""}
                placeholder={"https://instagram.com/you\nhttps://soundcloud.com/you"}
                className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[13px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)] resize-none font-mono" />
            </div>
          )}

          {/* Portfolio — artists only */}
          {showPortfolio && (
            <div className="space-y-1.5">
              <Label htmlFor="portfolioUrls" className="text-[12px] text-muted-foreground">Portfolio links (one per line)</Label>
              <textarea id="portfolioUrls" name="portfolioUrls" rows={2} defaultValue={profile.portfolioUrls?.join("\n") ?? ""}
                placeholder={"https://mixcloud.com/yourset\nhttps://youtube.com/watch?v=..."}
                className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[13px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)] resize-none font-mono" />
            </div>
          )}

          <button type="submit" disabled={isPending} className="btn-primary !py-2.5">
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </SettingsSection>
    </div>
  );
}
