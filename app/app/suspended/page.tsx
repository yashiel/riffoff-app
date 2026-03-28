import { redirect } from "next/navigation";
import { LogOut, ShieldOff } from "lucide-react";
import { getLoggedInUser } from "@/lib/appwrite/server";
import { logout } from "@/actions/auth";

export const metadata = { title: "Account Suspended — RiffOff" };

export default async function SuspendedPage() {
  const user = await getLoggedInUser();
  if (!user) {
    redirect("/login");
  }

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

        {/* Message */}
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Your account has been suspended. If you believe this is an error,
          please contact support at{" "}
          <a
            href="mailto:support@riffoff.live"
            className="font-medium text-coral underline underline-offset-4 transition-colors hover:text-coral/80"
          >
            support@riffoff.live
          </a>
          .
        </p>

        {/* Sign out */}
        <form action={logout} className="mt-8">
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
  );
}
