"use client";

import { Suspense, useState, useRef, useTransition, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowLeft, RefreshCw } from "lucide-react";
import { verifyOTP, resendOTP } from "@/actions/auth";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") ?? "";

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const code = digits.join("");
    if (code.length !== CODE_LENGTH) return;

    setError(null);
    startTransition(async () => {
      const result = await verifyOTP(email, code);
      if (result.error) {
        setError(result.error);
        // Clear inputs on error
        setDigits(Array(CODE_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
      } else if (result.redirect) {
        setSuccess(true);
        router.push(result.redirect);
      }
    });
  }, [digits, email, router]);

  function handleDigitChange(index: number, value: string) {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);

    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-advance to next input
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (digit && index === CODE_LENGTH - 1) {
      const code = newDigits.join("");
      if (code.length === CODE_LENGTH) {
        // Small delay to let state update
        setTimeout(() => {
          setError(null);
          startTransition(async () => {
            const result = await verifyOTP(email, code);
            if (result.error) {
              setError(result.error);
              setDigits(Array(CODE_LENGTH).fill(""));
              inputRefs.current[0]?.focus();
            } else if (result.redirect) {
              setSuccess(true);
              router.push(result.redirect);
            }
          });
        }, 100);
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      handleSubmit();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (pasted.length === 0) return;

    const newDigits = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    // Focus last filled or next empty
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();

    // Auto-submit if all digits pasted
    if (pasted.length === CODE_LENGTH) {
      setTimeout(() => {
        setError(null);
        startTransition(async () => {
          const result = await verifyOTP(email, pasted);
          if (result.error) {
            setError(result.error);
            setDigits(Array(CODE_LENGTH).fill(""));
            inputRefs.current[0]?.focus();
          } else if (result.redirect) {
            setSuccess(true);
            router.push(result.redirect);
          }
        });
      }, 100);
    }
  }

  function handleResend() {
    if (!canResend) return;
    setCanResend(false);
    setCooldown(RESEND_COOLDOWN);
    setError(null);

    startTransition(async () => {
      const result = await resendOTP(email);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  if (!email) {
    return (
      <div className="text-center">
        <h1 className="font-display text-[36px]">Verification</h1>
        <p className="mt-2 text-base text-muted-foreground">
          No email provided. Please register first.
        </p>
        <Link href="/register" className="btn-primary mt-6 inline-block">
          Go to Register
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center">
        {/* Email icon */}
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-coral/10">
          <Mail className="size-7 text-coral" />
        </div>

        <h1 className="mt-6 font-display text-[36px]">Check your email</h1>
        <p className="mt-2 text-base text-muted-foreground">
          We sent a 6-digit code to
        </p>
        <p className="mt-1 text-base font-semibold text-foreground">{email}</p>
      </div>

      <div className="mt-8">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-base text-red-400"
          >
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center text-base text-emerald-400">
            ✓ Email verified! Redirecting...
          </div>
        )}

        {/* OTP Input — 6 digit boxes */}
        <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={isPending || success}
              className={`size-12 rounded-xl border text-center text-[22px] font-bold outline-none transition-all sm:size-14 sm:text-[26px] ${
                digit
                  ? "border-coral/40 bg-coral/5 text-coral"
                  : "border-[var(--border)] bg-[var(--input)] text-foreground"
              } focus:border-coral focus:ring-2 focus:ring-coral/20 disabled:opacity-50`}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>

        {/* Verify button */}
        <button
          onClick={handleSubmit}
          disabled={isPending || success || digits.join("").length < CODE_LENGTH}
          className="btn-primary mt-6 w-full !py-3"
        >
          {isPending ? "Verifying..." : success ? "Verified ✓" : "Verify Email"}
        </button>

        {/* Resend */}
        <div className="mt-4 text-center">
          {canResend ? (
            <button
              onClick={handleResend}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 text-base font-medium text-coral transition-colors hover:text-coral/80"
            >
              <RefreshCw className="size-3.5" />
              Resend code
            </button>
          ) : (
            <p className="text-base text-muted-foreground">
              Resend code in <span className="font-medium text-foreground">{cooldown}s</span>
            </p>
          )}
        </div>

        {/* Didn't receive */}
        <p className="mt-6 text-center text-base text-muted-foreground/60">
          Didn&apos;t receive the email? Check your spam folder or{" "}
          <button onClick={handleResend} disabled={!canResend} className="text-coral/60 hover:text-coral disabled:text-muted-foreground">
            try again
          </button>
        </p>
      </div>

      {/* Back to register */}
      <div className="mt-8 text-center">
        <Link
          href="/register"
          className="inline-flex items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to register
        </Link>
      </div>
    </div>
  );
}
