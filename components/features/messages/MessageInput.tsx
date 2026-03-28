"use client";

import { useState, useRef } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { sendMessage, sendMessageWithAttachment } from "@/actions/messages";

interface MessageInputProps {
  applicationId: string;
  onMessageSent?: () => void;
}

export function MessageInput({ applicationId, onMessageSent }: MessageInputProps) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = body.trim().length > 0 || file !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend || sending) return;

    setSending(true);
    try {
      if (file) {
        const formData = new FormData();
        formData.set("file", file);
        await sendMessageWithAttachment(applicationId, body, formData);
      } else {
        await sendMessage(applicationId, body);
      }
      setBody("");
      setFile(null);
      onMessageSent?.();
    } finally {
      setSending(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (selected && selected.size > 5 * 1024 * 1024) {
      alert("File must be under 5MB");
      return;
    }
    setFile(selected);
  }

  function handleRemoveFile() {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-background p-3">
      {/* File preview */}
      {file && (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm text-muted-foreground">
          <Paperclip className="size-3 shrink-0" />
          <span className="truncate">{file.name}</span>
          <button
            type="button"
            onClick={handleRemoveFile}
            className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* File upload button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Attach file (PDF or image, max 5MB)"
        >
          <Paperclip className="size-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Text input */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message..."
          rows={2}
          maxLength={2000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          className="flex-1 resize-none rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-coral/40 focus:outline-none focus:ring-1 focus:ring-coral/20"
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={!canSend || sending}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-coral text-white transition-colors hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
    </form>
  );
}
