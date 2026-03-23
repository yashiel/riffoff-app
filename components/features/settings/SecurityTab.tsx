"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Monitor, Smartphone, Globe, X, Shield } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SettingsSection } from "./SettingsSection";
import { PasswordStrengthBar } from "./PasswordStrengthBar";
import { changePassword, setPassword, hasPasswordSet } from "@/actions/settings/password";
import { listMySessions, revokeSession, revokeAllOtherSessions, type SessionInfo } from "@/actions/settings/sessions";
import { requestEmailChange } from "@/actions/settings/email";
import { formatDate } from "@/lib/utils";

interface SecurityTabProps {
  userEmail: string;
  userHasPassword?: boolean;
}

export function SecurityTab({ userEmail, userHasPassword }: SecurityTabProps) {
  return (
    <div className="space-y-6">
      <PasswordSection hasPassword={userHasPassword ?? true} />
      <EmailChangeSection currentEmail={userEmail} />
      <SessionsSection />
    </div>
  );
}

function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordSet, setPasswordSet] = useState(hasPassword);

  function handleChangePassword(formData: FormData) {
    setError(null); setSuccess(false);
    startTransition(async () => {
      const result = await changePassword({
        currentPassword: formData.get("currentPassword") as string,
        newPassword: formData.get("newPassword") as string,
      });
      if (result.error) setError(result.error);
      if (result.success) { setSuccess(true); setNewPassword(""); setTimeout(() => setSuccess(false), 3000); }
    });
  }

  function handleSetPassword(formData: FormData) {
    setError(null); setSuccess(false);
    startTransition(async () => {
      const result = await setPassword({
        newPassword: formData.get("newPassword") as string,
      });
      if (result.error) setError(result.error);
      if (result.success) {
        setSuccess(true);
        setNewPassword("");
        setPasswordSet(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  if (!passwordSet) {
    // OAuth-only user — needs to set a password for the first time
    return (
      <SettingsSection
        title="Set a Password"
        description="You signed up with a social account. Set a password so you can also sign in with email."
      >
        {error && <div role="alert" className="mb-3 rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">{error}</div>}
        {success && <div className="mb-3 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-400">Password set successfully! You can now sign in with email too.</div>}
        <form action={handleSetPassword} className="space-y-3 max-w-sm">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="text-[12px] text-muted-foreground">Create a password</Label>
            <input id="newPassword" name="newPassword" type="password" required minLength={8} maxLength={128}
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[14px] text-white outline-none focus:border-[rgba(255,255,255,0.3)]" />
            <PasswordStrengthBar password={newPassword} />
          </div>
          <button type="submit" disabled={isPending} className="btn-primary !py-2 !text-[12px]">
            {isPending ? "Setting..." : "Set Password"}
          </button>
        </form>
      </SettingsSection>
    );
  }

  // User has a password — show change form
  return (
    <SettingsSection title="Change Password" description="Update your password regularly for security.">
      {error && <div role="alert" className="mb-3 rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">{error}</div>}
      {success && <div className="mb-3 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-400">Password changed successfully</div>}
      <form action={handleChangePassword} className="space-y-3 max-w-sm">
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword" className="text-[12px] text-muted-foreground">Current password</Label>
          <input id="currentPassword" name="currentPassword" type="password" required minLength={8}
            className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[14px] text-white outline-none focus:border-[rgba(255,255,255,0.3)]" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPassword" className="text-[12px] text-muted-foreground">New password</Label>
          <input id="newPassword" name="newPassword" type="password" required minLength={8} maxLength={128}
            value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[14px] text-white outline-none focus:border-[rgba(255,255,255,0.3)]" />
          <PasswordStrengthBar password={newPassword} />
        </div>
        <button type="submit" disabled={isPending} className="btn-primary !py-2 !text-[12px]">
          {isPending ? "Changing..." : "Change Password"}
        </button>
      </form>
    </SettingsSection>
  );
}

function EmailChangeSection({ currentEmail }: { currentEmail: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null); setSuccess(false);
    startTransition(async () => {
      const result = await requestEmailChange({
        newEmail: formData.get("newEmail") as string,
        password: formData.get("password") as string,
      });
      if (result.error) setError(result.error);
      if (result.success) { setSuccess(true); setTimeout(() => setSuccess(false), 5000); }
    });
  }

  return (
    <SettingsSection title="Email Address" description={`Current: ${currentEmail}`}>
      {error && <div role="alert" className="mb-3 rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">{error}</div>}
      {success && <div className="mb-3 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-400">Email updated</div>}
      <form action={handleSubmit} className="space-y-3 max-w-sm">
        <div className="space-y-1.5">
          <Label htmlFor="newEmail" className="text-[12px] text-muted-foreground">New email</Label>
          <input id="newEmail" name="newEmail" type="email" required
            className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[14px] text-white outline-none focus:border-[rgba(255,255,255,0.3)]" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emailPassword" className="text-[12px] text-muted-foreground">Confirm password</Label>
          <input id="emailPassword" name="password" type="password" required minLength={8}
            className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[14px] text-white outline-none focus:border-[rgba(255,255,255,0.3)]" />
        </div>
        <button type="submit" disabled={isPending} className="btn-primary !py-2 !text-[12px]">
          {isPending ? "Updating..." : "Update Email"}
        </button>
      </form>
    </SettingsSection>
  );
}

function SessionsSection() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isPending, startTransition] = useTransition();
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      startTransition(async () => { setSessions(await listMySessions()); });
    }
  }, []);

  function handleRevoke(sessionId: string) {
    startTransition(async () => {
      const result = await revokeSession(sessionId);
      if (result.error) alert(result.error);
      else setSessions(await listMySessions());
    });
  }

  function handleRevokeAll() {
    startTransition(async () => {
      const result = await revokeAllOtherSessions();
      if (result.error) alert(result.error);
      else setSessions(await listMySessions());
    });
  }

  const DeviceIcon = ({ os }: { os: string }) => {
    if (os.toLowerCase().includes("android") || os.toLowerCase().includes("ios")) return <Smartphone className="size-4" />;
    return <Monitor className="size-4" />;
  };

  return (
    <SettingsSection title="Active Sessions" description="Manage devices where you're signed in.">
      <div className="space-y-2">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-lg border border-[rgba(255,255,255,0.03)] p-3 text-[13px]">
            <DeviceIcon os={s.os} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{s.device}</span>
                {s.current && <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">Current</span>}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="size-3" />{s.country} · {s.ip} · {formatDate(s.createdAt, { dateStyle: "medium" })}
              </div>
            </div>
            {!s.current && (
              <button onClick={() => handleRevoke(s.id)} disabled={isPending}
                className="rounded p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400">
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {sessions.filter((s) => !s.current).length > 0 && (
        <button onClick={handleRevokeAll} disabled={isPending}
          className="mt-3 flex items-center gap-1.5 text-[12px] text-red-400 hover:text-red-300">
          <Shield className="size-3" /> Revoke all other sessions
        </button>
      )}
    </SettingsSection>
  );
}
