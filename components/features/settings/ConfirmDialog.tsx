"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmText?: string;
  /** If set, user must type this exact text to confirm */
  typeToConfirm?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmText = "Confirm",
  typeToConfirm,
  danger = false,
  onConfirm,
  disabled = false,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [isPending, setIsPending] = useState(false);

  const canConfirm = typeToConfirm ? typed === typeToConfirm : true;

  async function handleConfirm() {
    setIsPending(true);
    try {
      await onConfirm();
    } finally {
      setIsPending(false);
      setOpen(false);
      setTyped("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setTyped(""); }}>
      <DialogTrigger asChild disabled={disabled}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="border-[var(--border)] bg-[#1e1e1e] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={danger ? "text-red-400" : ""}>{title}</DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        {typeToConfirm && (
          <div className="space-y-2">
            <p className="text-[12px] text-muted-foreground">
              Type <strong className="text-foreground">{typeToConfirm}</strong> to confirm:
            </p>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={typeToConfirm}
              className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2 text-[14px] text-white outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)]"
              autoFocus
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            onClick={() => setOpen(false)}
            className="btn-ghost !py-2 !text-[12px]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || isPending || disabled}
            className={`rounded px-4 py-2 text-[12px] font-bold uppercase transition-colors disabled:opacity-30 ${
              danger
                ? "bg-red-500 text-white hover:bg-red-400"
                : "bg-white text-black hover:bg-white/90"
            }`}
          >
            {isPending ? "Processing..." : confirmText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
