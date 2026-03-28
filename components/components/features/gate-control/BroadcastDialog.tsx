"use client";

import { useState, useTransition } from "react";
import { Megaphone, X } from "lucide-react";
import { broadcastMessage } from "@/actions/gate";

interface BroadcastDialogProps {
  eventId: string;
}

const MAX_CHARS = 200;

export function BroadcastDialog({ eventId }: BroadcastDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    if (!message.trim()) return;
    setError("");
    setSuccess(false);

    startTransition(async () => {
      try {
        await broadcastMessage(eventId, message.trim());
        setSuccess(true);
        setMessage("");
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-coral px-3.5 py-2 text-base font-bold text-[#0e0e10] transition-colors hover:bg-coral/90"
      >
        <Megaphone className="size-3.5" />
        Broadcast
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-foreground">
                Broadcast Message
              </h3>
              <button
                onClick={() => {
                  setOpen(false);
                  setMessage("");
                  setError("");
                  setSuccess(false);
                }}
                aria-label="Close broadcast dialog"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mt-2 text-base text-muted-foreground">
              Send a message to all active gate scanners.
            </p>

            {error && (
              <p className="mt-3 rounded-lg bg-red-400/10 px-3 py-2 text-base text-red-400">
                {error}
              </p>
            )}

            {success && (
              <p className="mt-3 rounded-lg bg-emerald-400/10 px-3 py-2 text-base text-emerald-400">
                Message sent successfully.
              </p>
            )}

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Type your message..."
              rows={3}
              maxLength={MAX_CHARS}
              className="mt-3 w-full resize-none rounded-lg border border-border bg-muted/80 px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-coral/40"
            />
            <p className="mt-1 text-right text-sm tabular-nums text-muted-foreground">
              {message.length}/{MAX_CHARS}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleSend}
                disabled={isPending || !message.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-coral px-4 py-2 text-base font-bold text-[#0e0e10] transition-colors hover:bg-coral/90 disabled:opacity-50"
              >
                {isPending ? "Sending..." : "Send"}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setMessage("");
                  setError("");
                  setSuccess(false);
                }}
                className="rounded-lg px-4 py-2 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
