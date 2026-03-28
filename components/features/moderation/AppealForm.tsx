"use client";

import { useState, useTransition } from "react";
import { fileAppeal } from "@/actions/appeals";

interface AppealFormProps {
  moderationItemId: string;
  actionTaken: string;
  reason: string;
}

export function AppealForm({ moderationItemId, actionTaken, reason }: AppealFormProps) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.length < 10 || text.length > 1000) return;

    setError(null);
    startTransition(async () => {
      const result = await fileAppeal(moderationItemId, text);
      if (result.error) {
        setError(result.error);
      } else {
        setSubmitted(true);
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
        <p className="text-lg font-medium text-emerald-400">Appeal submitted</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your appeal is being reviewed. You will be notified of the outcome.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Original action context */}
      <div className="rounded-lg border border-[var(--border)] bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Action taken:</span>{" "}
          {actionTaken.replace(/_/g, " ")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Reason:</span>{" "}
          {reason}
        </p>
      </div>

      {/* Appeal reason */}
      <div>
        <label
          htmlFor="appeal-reason"
          className="block text-sm font-medium text-foreground"
        >
          Why do you believe this action should be reversed?
        </label>
        <textarea
          id="appeal-reason"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Explain your reasoning (10-1000 characters)..."
          className="mt-2 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          disabled={isPending}
        />
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {text.length < 10 && text.length > 0 && (
              <span className="text-red-400">Minimum 10 characters</span>
            )}
          </span>
          <span className={text.length > 1000 ? "text-red-400" : ""}>
            {text.length}/1000
          </span>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || text.length < 10 || text.length > 1000}
        className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-coral/90 disabled:opacity-50"
      >
        {isPending ? "Submitting..." : "Submit Appeal"}
      </button>
    </form>
  );
}
