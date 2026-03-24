"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, loginWithProvider, type AuthResult } from "@/actions/auth";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState<AuthResult, FormData>(
    register,
    {},
  );

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
            <span className="w-full border-t border-[rgba(255,255,255,0.1)]" />
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
              className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-400"
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
              className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2.5 text-[14px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)] transition-colors"
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
              className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2.5 text-[14px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)] transition-colors"
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
              className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-2.5 text-[14px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)] transition-colors"
            />
          </div>

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
