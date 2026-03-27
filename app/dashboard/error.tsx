"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DASHBOARD ERROR]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <h2 className="font-display text-xl">Something went wrong</h2>
      <p className="mt-2 max-w-md text-center text-base text-muted-foreground">
        {error.message || "An unexpected error occurred loading this page."}
      </p>
      {error.digest && (
        <p className="mt-1 text-sm text-muted-foreground/60">Error ID: {error.digest}</p>
      )}
      <button onClick={reset} className="btn-primary mt-6 !py-2 !text-base">
        Try again
      </button>
    </div>
  );
}
