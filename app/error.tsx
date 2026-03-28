"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Root error boundary for children of the root layout.
 * Auto-reloads on chunk loading failures (stale deployment cache).
 */
export default function RootError({
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
    }
  }, [isChunkError]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-2xl font-bold tracking-tight">
        Something went wrong
      </h2>
      <p className="max-w-md text-muted-foreground">
        {isChunkError
          ? "A new version is available. Reloading..."
          : "We couldn\u0027t load this page. Please try again."}
      </p>
      {error.digest && (
        <p className="text-sm text-muted-foreground">
          Error ID: {error.digest}
        </p>
      )}
      {!isChunkError && <Button onClick={reset}>Try again</Button>}
    </div>
  );
}
