"use client";

import { Download } from "lucide-react";

interface ExportButtonProps {
  eventId: string;
}

export function ExportButton({ eventId }: ExportButtonProps) {
  function handleExport() {
    window.open(`/api/events/${eventId}/gate-export`, "_blank");
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/80 px-3.5 py-2 text-base font-medium text-foreground transition-colors hover:bg-muted"
    >
      <Download className="size-3.5" />
      Export
    </button>
  );
}
