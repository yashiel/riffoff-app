"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { getThreadMessages } from "@/actions/messages";
import type { MessageDoc } from "@/lib/appwrite/types";
import type { ThreadParticipants } from "@/actions/messages";

const POLL_INTERVAL_MS = 10_000;

interface MessageThreadProps {
  applicationId: string;
  currentUserId: string;
  participants: ThreadParticipants;
  initialMessages: MessageDoc[];
}

export function MessageThread({
  applicationId,
  currentUserId,
  participants,
  initialMessages,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<MessageDoc[]>(initialMessages);

  const fetchMessages = useCallback(async () => {
    try {
      const fresh = await getThreadMessages(applicationId);
      setMessages(fresh);
    } catch {
      // Silently fail on poll errors
    }
  }, [applicationId]);

  // Poll for new messages
  useEffect(() => {
    const interval = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  function handleMessageSent() {
    // Immediately re-fetch after sending
    void fetchMessages();
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border">
      {/* Message list area */}
      <div className="max-h-[400px] min-h-[200px] overflow-y-auto sm:max-h-[500px]">
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          participants={participants}
        />
      </div>

      {/* Input area */}
      <MessageInput
        applicationId={applicationId}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}
