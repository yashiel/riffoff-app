"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-2xl font-bold tracking-tight">
        Something went wrong
      </h2>
      <p className="max-w-md text-muted-foreground">
        We couldn&apos;t load this page. Please try again.
      </p>
      {error.digest && (
        <p className="text-[13px] text-muted-foreground">
          Error ID: {error.digest}
        </p>
      )}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
