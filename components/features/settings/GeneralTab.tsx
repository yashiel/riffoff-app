"use client";

import { useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

/** All IANA timezones — uses runtime API with comprehensive fallback */
const TIMEZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [
      "UTC",
      "Africa/Abidjan","Africa/Accra","Africa/Addis_Ababa","Africa/Algiers","Africa/Cairo","Africa/Casablanca","Africa/Johannesburg","Africa/Lagos","Africa/Nairobi","Africa/Tunis",
      "America/Anchorage","America/Argentina/Buenos_Aires","America/Bogota","America/Chicago","America/Denver","America/Edmonton","America/Halifax","America/Havana","America/Lima","America/Los_Angeles","America/Manaus","America/Mexico_City","America/New_York","America/Panama","America/Phoenix","America/Santiago","America/Sao_Paulo","America/St_Johns","America/Toronto","America/Vancouver","America/Winnipeg",
      "Asia/Almaty","Asia/Amman","Asia/Baghdad","Asia/Baku","Asia/Bangkok","Asia/Beirut","Asia/Colombo","Asia/Damascus","Asia/Dhaka","Asia/Dubai","Asia/Ho_Chi_Minh","Asia/Hong_Kong","Asia/Irkutsk","Asia/Istanbul","Asia/Jakarta","Asia/Jerusalem","Asia/Kabul","Asia/Kamchatka","Asia/Karachi","Asia/Kathmandu","Asia/Kolkata","Asia/Krasnoyarsk","Asia/Kuala_Lumpur","Asia/Kuwait","Asia/Magadan","Asia/Manila","Asia/Muscat","Asia/Novosibirsk","Asia/Rangoon","Asia/Riyadh","Asia/Seoul","Asia/Shanghai","Asia/Singapore","Asia/Taipei","Asia/Tashkent","Asia/Tehran","Asia/Tokyo","Asia/Vladivostok","Asia/Yakutsk","Asia/Yekaterinburg",
      "Atlantic/Azores","Atlantic/Cape_Verde","Atlantic/Reykjavik",
      "Australia/Adelaide","Australia/Brisbane","Australia/Darwin","Australia/Hobart","Australia/Melbourne","Australia/Perth","Australia/Sydney",
      "Europe/Amsterdam","Europe/Athens","Europe/Belgrade","Europe/Berlin","Europe/Brussels","Europe/Bucharest","Europe/Budapest","Europe/Copenhagen","Europe/Dublin","Europe/Helsinki","Europe/Kiev","Europe/Lisbon","Europe/London","Europe/Madrid","Europe/Minsk","Europe/Moscow","Europe/Oslo","Europe/Paris","Europe/Prague","Europe/Riga","Europe/Rome","Europe/Sofia","Europe/Stockholm","Europe/Tallinn","Europe/Vienna","Europe/Vilnius","Europe/Warsaw","Europe/Zurich",
      "Indian/Maldives","Indian/Mauritius",
      "Pacific/Auckland","Pacific/Chatham","Pacific/Fiji","Pacific/Guam","Pacific/Honolulu","Pacific/Midway","Pacific/Noumea","Pacific/Pago_Pago","Pacific/Samoa","Pacific/Tongatapu",
    ];
  }
})();

/** Format: "Asia/Kuala Lumpur (GMT+8)" */
function formatTz(tz: string): string {
  try {
    const offset = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? "";
    return `${tz.replace(/_/g, " ")} (${offset})`;
  } catch {
    return tz.replace(/_/g, " ");
  }
}

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

  const [timezone, setTimezone] = useState(profile.timezone ?? "UTC");
  const [language, setLanguage] = useState(profile.language ?? "en");
  const [currency, setCurrency] = useState(currentCurrency);

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
        <div role="alert" className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-base text-red-400">{error}</div>
      )}
      {success && (
        <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-base text-emerald-400">Profile updated</div>
      )}

      {/* Role upgrade */}
      {profile.role === "attendee" && (
        <SettingsSection title="Upgrade Account" description="Unlock additional features by upgrading your role.">
          <div className="flex gap-2">
            <button onClick={() => handleUpgradeRole("artist")} disabled={isPending} className="btn-primary !py-2 !text-base">Become an Artist</button>
            <button onClick={() => handleUpgradeRole("organiser")} disabled={isPending} className="btn-ghost !py-2 !text-base">Become an Organiser</button>
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
            <label className="btn-ghost inline-flex cursor-pointer items-center gap-1.5 !py-1.5 !text-sm">
              <Camera className="size-3" />
              {isUploading ? "Uploading..." : "Upload photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} disabled={isUploading} className="hidden" />
            </label>
            {photoUrl && (
              <button onClick={handleDeleteAvatar} disabled={isPending} className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300">
                <Trash2 className="size-3" /> Remove
              </button>
            )}
            <p className="text-sm text-muted-foreground">JPEG, PNG, or WebP. Max 2MB.</p>
          </div>
        </div>
      </SettingsSection>

      {/* Profile info form */}
      <SettingsSection title="Profile Information">
        <form action={handleSubmit} className="space-y-4">
          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-base text-muted-foreground">Email</Label>
            <div className="flex items-center gap-2">
              <p className="text-base text-foreground">{userEmail}</p>
              <a href="/dashboard/settings?tab=security" className="text-sm text-coral hover:underline">Change</a>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-base text-muted-foreground">Display name</Label>
              <input id="displayName" name="displayName" required maxLength={100} defaultValue={profile.displayName ?? ""}
                className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2 text-base text-foreground outline-none focus:border-ring" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-base text-muted-foreground">Phone (optional)</Label>
              <input id="phone" name="phone" type="tel" maxLength={20} defaultValue={profile.phone ?? ""}
                className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2 text-base text-foreground outline-none focus:border-ring" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-base text-muted-foreground">Timezone</Label>
              <input type="hidden" name="timezone" value={timezone} />
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="h-auto w-full rounded border-border bg-input/30 px-3 py-2 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz} className="text-sm">{formatTz(tz)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-base text-muted-foreground">Language</Label>
              <input type="hidden" name="language" value={language} />
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-auto w-full rounded border-border bg-input/30 px-3 py-2 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code} className="text-base">{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-base text-muted-foreground">Display currency</Label>
              <input type="hidden" name="currency" value={currency} />
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-auto w-full rounded border-border bg-input/30 px-3 py-2 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original" className="text-base">🌐 Original</SelectItem>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-base">{c.flag} {c.code} — {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bio — artists & organisers */}
          {showBio && (
            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-base text-muted-foreground">
                {role === "organiser" ? "About your organisation" : "Bio"}
              </Label>
              <textarea id="bio" name="bio" rows={3} maxLength={500} defaultValue={profile.bio ?? ""}
                placeholder={role === "organiser" ? "Tell people about your organisation..." : "Tell people about yourself..."}
                className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)] resize-none" />
            </div>
          )}

          {/* Genres — artists only */}
          {showGenres && (
            <div className="space-y-1.5">
              <Label htmlFor="artistGenres" className="text-base text-muted-foreground">Genres (comma-separated)</Label>
              <input id="artistGenres" name="artistGenres" defaultValue={profile.artistGenres?.join(", ") ?? ""}
                placeholder="Electronic, Techno, House"
                className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)]" />
            </div>
          )}

          {/* Social links — artists & organisers */}
          {showSocialLinks && (
            <div className="space-y-1.5">
              <Label htmlFor="socialLinks" className="text-base text-muted-foreground">Social links (one per line)</Label>
              <textarea id="socialLinks" name="socialLinks" rows={2} defaultValue={profile.socialLinks?.join("\n") ?? ""}
                placeholder={"https://instagram.com/you\nhttps://soundcloud.com/you"}
                className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)] resize-none font-mono" />
            </div>
          )}

          {/* Portfolio — artists only */}
          {showPortfolio && (
            <div className="space-y-1.5">
              <Label htmlFor="portfolioUrls" className="text-base text-muted-foreground">Portfolio links (one per line)</Label>
              <textarea id="portfolioUrls" name="portfolioUrls" rows={2} defaultValue={profile.portfolioUrls?.join("\n") ?? ""}
                placeholder={"https://mixcloud.com/yourset\nhttps://youtube.com/watch?v=..."}
                className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)] resize-none font-mono" />
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
