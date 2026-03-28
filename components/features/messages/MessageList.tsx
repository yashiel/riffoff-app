"use client";

import { useEffect, useRef } from "react";
import { Paperclip, MessageSquare } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { MessageDoc } from "@/lib/appwrite/types";
import type { ThreadParticipants } from "@/actions/messages";

interface MessageListProps {
  messages: MessageDoc[];
  currentUserId: string;
  participants: ThreadParticipants;
}

export function MessageList({
  messages,
  currentUserId,
  participants,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <MessageSquare className="size-5 text-muted-foreground" />
        </div>
        <p className="mt-3 text-base font-medium text-muted-foreground">
          No messages yet
        </p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          Start the conversation!
        </p>
      </div>
    );
  }

  function getSenderName(senderId: string): string {
    if (senderId === participants.artistId) return participants.artistName;
    if (senderId === participants.organiserId) return participants.organiserName;
    return "Unknown";
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto px-1 py-2">
      {messages.map((message) => {
        const isOwn = message.senderId === currentUserId;
        const senderName = getSenderName(message.senderId);

        return (
          <div
            key={message.$id}
            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-3.5 py-2.5 sm:max-w-[70%] ${
                isOwn
                  ? "rounded-br-sm bg-coral/10 border border-coral/20"
                  : "rounded-bl-sm bg-muted border border-border"
              }`}
            >
              <p
                className={`text-xs font-medium ${
                  isOwn ? "text-coral" : "text-muted-foreground"
                }`}
              >
                {senderName}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {message.body}
              </p>
              {message.attachmentUrl && (
                <a
                  href={message.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-background/50 px-2.5 py-1.5 text-xs font-medium text-coral transition-colors hover:bg-background/80"
                >
                  <Paperclip className="size-3" />
                  View attachment
                </a>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground/60">
                {formatRelativeTime(message.$createdAt)}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
