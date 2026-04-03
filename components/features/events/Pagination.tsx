"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Last event $id for cursor-based "Next" navigation (faster than offset for deep pages) */
  lastCursor?: string | null;
}

export function Pagination({ currentPage, totalPages, lastCursor }: PaginationProps) {
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function getPageUrl(page: number, cursor?: string): string {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
      params.delete("cursor");
    } else {
      params.set("page", String(page));
      // Use cursor for "Next" navigation (fast for deep pages)
      if (cursor) {
        params.set("cursor", cursor);
      } else {
        params.delete("cursor");
      }
    }
    return `/events?${params.toString()}`;
  }

  // Build page numbers: show up to 5 pages with ellipsis
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1"
    >
      {/* Previous — always uses offset (going backward is fine) */}
      {currentPage > 1 ? (
        <Link
          href={getPageUrl(currentPage - 1)}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className="flex size-9 items-center justify-center rounded-lg text-muted-foreground/30">
          <ChevronLeft className="size-4" />
        </span>
      )}

      {/* Page numbers — use offset (bookmarkable, direct jump) */}
      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className="flex size-9 items-center justify-center text-base text-muted-foreground/50"
          >
            …
          </span>
        ) : (
          <Link
            key={p}
            href={getPageUrl(p)}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg text-base font-medium transition-all",
              p === currentPage
                ? "bg-coral text-white dark:text-[#08080a]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-current={p === currentPage ? "page" : undefined}
          >
            {p}
          </Link>
        )
      )}

      {/* Next — uses cursor for fast deep pagination */}
      {currentPage < totalPages ? (
        <Link
          href={getPageUrl(currentPage + 1, lastCursor ?? undefined)}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className="flex size-9 items-center justify-center rounded-lg text-muted-foreground/30">
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
