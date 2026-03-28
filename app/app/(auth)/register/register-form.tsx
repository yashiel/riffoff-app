"use client";

import { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Music, Mic } from "lucide-react";
import { register, loginWithProvider, type AuthResult } from "@/actions/auth";
import { Label } from "@/components/ui/label";

const ROLE_INFO: Record<string, { title: string; subtitle: string; icon: React.ElementType }> = {
  artist: { title: "Join as Artist", subtitle: "Apply to perform, share your music, connect with organisers", icon: Mic },
  organiser: { title: "Join as Organiser", subtitle: "Create events, sell tickets, manage your shows", icon: Music },
};

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");

  // Only allow safe roles from URL
  const signupRole = (roleParam === "artist" || roleParam === "organiser") ? roleParam : "attendee";
  const roleInfo = ROLE_INFO[signupRole];

  const [state, formAction, isPending] = useActionState<AuthResult, FormData>(
    register,
    {},
  );

  useEffect(() => {
    if (state.redirect) {
      router.push(state.redirect);
    }
  }, [state.redirect, router]);

  return (
    <div>
      <div className="text-center">
        {roleInfo ? (
          <>
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-coral/10">
              <roleInfo.icon className="size-6 text-coral" />
            </div>
            <h1 className="font-display text-[36px]">{roleInfo.title}</h1>
            <p className="mt-2 text-base text-muted-foreground">{roleInfo.subtitle}</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-[36px]">Create account</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Join RiffOff to discover events and buy tickets
            </p>
          </>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {/* OAuth */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form action={() => loginWithProvider("google")}>
            <button type="submit" className="btn-ghost w-full !text-base">
              Google
            </button>
          </form>
          <form action={() => loginWithProvider("facebook")}>
            <button type="submit" className="btn-ghost w-full !text-base">
              Facebook
            </button>
          </form>
        </div>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[var(--border)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-base uppercase tracking-wider text-muted-foreground">
              Or sign up with email
            </span>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          {/* Hidden role field — validated server-side, only attendee/artist/organiser allowed */}
          <input type="hidden" name="role" value={signupRole} />

          {state.error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-base text-red-400"
            >
              {state.error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-base text-muted-foreground">
              Full name
            </Label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Your full name"
              className="w-full rounded-xl bg-[var(--input)] border border-[var(--border)] px-4 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/10 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-base text-muted-foreground">
              Email
            </Label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-xl bg-[var(--input)] border border-[var(--border)] px-4 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/10 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-base text-muted-foreground">
              Password
            </Label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="w-full rounded-xl bg-[var(--input)] border border-[var(--border)] px-4 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/10 transition-all"
            />
          </div>

          {/* Terms acknowledgement */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="termsAccepted"
              required
              className="mt-1 size-4 rounded border-[var(--border)] bg-transparent accent-coral"
            />
            <span className="text-base leading-relaxed text-muted-foreground">
              I agree to the{" "}
              <Link href="/terms" className="text-coral hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-coral hover:underline">
                Privacy Policy
              </Link>
              . I understand RiffOff will process my data as described.
            </span>
          </label>

          <button
            type="submit"
            className="btn-primary w-full !py-3"
            disabled={isPending}
          >
            {isPending ? "Creating account..." : "Create account"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-base text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-coral hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
