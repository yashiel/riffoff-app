"use client";

import { useEffect } from "react";

export default function DashboardError({
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
      // Chunk mismatch from stale deployment — hard reload to get fresh chunks
      window.location.reload();
      return;
    }
    console.error("[dashboard] Error boundary caught", { message: error.message, digest: error.digest });
  }, [error, isChunkError]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <h2 className="font-display text-xl">
        {isChunkError ? "Updating..." : "Something went wrong"}
      </h2>
      <p className="mt-2 max-w-md text-center text-base text-muted-foreground">
        {isChunkError
          ? "A new version is available. Reloading..."
          : error.message || "An unexpected error occurred loading this page."}
      </p>
      {error.digest && !isChunkError && (
        <p className="mt-1 text-sm text-muted-foreground/60">Error ID: {error.digest}</p>
      )}
      {!isChunkError && (
        <button onClick={reset} className="btn-primary mt-6 !py-2 !text-base">
          Try again
        </button>
      )}
    </div>
  );
}
