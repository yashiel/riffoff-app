"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function getPageUrl(page: number): string {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    return `/events?${params.toString()}`;
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
      <Button variant="outline" size="sm" asChild disabled={currentPage <= 1}>
        <Link href={getPageUrl(currentPage - 1)}>Previous</Link>
      </Button>

      <span className="px-2 text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        asChild
        disabled={currentPage >= totalPages}
      >
        <Link href={getPageUrl(currentPage + 1)}>Next</Link>
      </Button>
    </nav>
  );
}
