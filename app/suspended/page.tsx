import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, ShieldOff, Clock, Mail } from "lucide-react";
import { Query } from "node-appwrite";
import { getLoggedInUser } from "@/lib/appwrite/server";
import { getProfileByUserId } from "@/actions/profiles";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { logout } from "@/actions/auth";
import type { UserWarningDoc } from "@/lib/appwrite/types";

export const metadata = { title: "Account Suspended — RiffOff" };

export default async function SuspendedPage() {
  const user = await getLoggedInUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getProfileByUserId(user.$id);

  // Fetch the latest active warning/ban for this user
  let latestWarning: UserWarningDoc | null = null;
  try {
    const { databases } = await createAdminClient();
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.USER_WARNINGS,
      [
        Query.equal("userId", user.$id),
        Query.isNull("liftedAt"),
        Query.orderDesc("$createdAt"),
        Query.limit(1),
      ],
    );
    latestWarning = (documents[0] as unknown as UserWarningDoc) ?? null;
  } catch {
    // Non-critical — show generic message
  }

  const isPermanent = profile?.banLevel === "permanent_banned";
  const isTempBan = profile?.banLevel === "temp_banned";
  const banExpiresAt = profile?.banExpiresAt ?? null;
  const reason = latestWarning?.reason ?? null;
  const moderationItemId = latestWarning?.moderationItemId ?? null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldOff className="size-8 text-destructive" />
        </div>

        {/* Heading */}
        <h1 className="mt-6 font-display text-2xl sm:text-3xl text-foreground">
          Account Suspended
        </h1>

        {/* Ban details */}
        {isPermanent && (
          <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-base font-medium text-destructive">
              Your account has been permanently suspended.
            </p>
            {reason && (
              <p className="mt-2 text-sm text-muted-foreground">
                Reason: {reason}
              </p>
            )}
          </div>
        )}

        {isTempBan && banExpiresAt && (
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
              <Clock className="size-4" />
              <p className="text-base font-medium">Temporary Suspension</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account is suspended until{" "}
              <time dateTime={banExpiresAt} className="font-medium text-foreground">
                {new Date(banExpiresAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
              .
            </p>
            {reason && (
              <p className="mt-2 text-sm text-muted-foreground">
                Reason: {reason}
              </p>
            )}
          </div>
        )}

        {!isPermanent && !isTempBan && (
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Your account has been suspended.
            {reason && <> Reason: {reason}</>}
          </p>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col items-center gap-3">
          {/* Appeal link */}
          {moderationItemId && (
            <Link
              href={`/dashboard/appeal/${moderationItemId}`}
              className="inline-flex items-center gap-2 bg-coral px-6 py-3 text-base font-medium text-white transition-colors hover:bg-coral/90"
            >
              Appeal this decision
            </Link>
          )}

          {/* Contact support */}
          <a
            href="mailto:support@riffoff.live"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Mail className="size-4" />
            Contact support
          </a>

          {/* Sign out */}
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-muted px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted/80"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
