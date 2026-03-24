"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register, loginWithProvider, type AuthResult } from "@/actions/auth";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<AuthResult, FormData>(
    register,
    {},
  );

  // Handle redirect from server action
  useEffect(() => {
    if (state.redirect) {
      router.push(state.redirect);
    }
  }, [state.redirect, router]);

  return (
    <div>
      <div className="text-center">
        <h1 className="font-display text-[36px]">Create account</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Join RiffOff to discover events and buy tickets
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {/* OAuth */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form action={() => loginWithProvider("google")}>
            <button type="submit" className="btn-ghost w-full !text-[13px]">
              Google
            </button>
          </form>
          <form action={() => loginWithProvider("facebook")}>
            <button type="submit" className="btn-ghost w-full !text-[13px]">
              Facebook
            </button>
          </form>
        </div>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[var(--border)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-[12px] uppercase tracking-wider text-muted-foreground">
              Or sign up with email
            </span>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          {state.error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-400"
            >
              {state.error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[13px] text-muted-foreground">
              Full name
            </Label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Your full name"
              className="w-full rounded-xl bg-[var(--input)] border border-[var(--border)] px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/10 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px] text-muted-foreground">
              Email
            </Label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-xl bg-[var(--input)] border border-[var(--border)] px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/10 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[13px] text-muted-foreground">
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
              className="w-full rounded-xl bg-[var(--input)] border border-[var(--border)] px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/10 transition-all"
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
            <span className="text-[13px] leading-relaxed text-muted-foreground">
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

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-coral hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
