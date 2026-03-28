"use client";

import { useEffect } from "react";

/**
 * Global error boundary — catches errors in the ROOT layout itself.
 * app/error.tsx only catches errors in children; this catches layout crashes.
 * Must provide its own <html> and <body> since the root layout may have failed.
 * Auto-reloads on chunk loading failures (stale deployment cache).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error.message?.includes("Failed to load") ||
    error.message?.includes("Loading chunk") ||
    error.message?.includes("ChunkLoadError");

  useEffect(() => {
    if (isChunkError) {
      window.location.reload();
    }
  }, [isChunkError]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#0e0e10] px-4 text-center text-white">
        <div className="mx-auto max-w-md">
          <h2 className="text-2xl font-bold tracking-tight">
            {isChunkError ? "Updating..." : "Something went wrong"}
          </h2>
          <p className="mt-3 text-base text-neutral-400">
            {isChunkError
              ? "A new version is available. Reloading..."
              : "We couldn\u0027t load this page. Please try again."}
          </p>
          {error.digest && !isChunkError && (
            <p className="mt-1 text-sm text-neutral-500">
              Error ID: {error.digest}
            </p>
          )}
          {!isChunkError && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={reset}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
              >
                Try again
              </button>
              <a
                href="/"
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
              >
                Go home
              </a>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
