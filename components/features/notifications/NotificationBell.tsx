"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { NotificationItem } from "./NotificationItem";
import {
  getMyNotifications,
  getUnreadCount,
  markAllAsRead,
} from "@/actions/notifications";
import type { NotificationDoc } from "@/lib/appwrite/types";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false);

  // Fetch unread count on mount
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      startTransition(async () => {
        const count = await getUnreadCount();
        setUnreadCount(count);
      });
    }
  }, []);

  // Poll unread count every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(async () => {
        const count = await getUnreadCount();
        setUnreadCount(count);
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load notifications when dropdown opens
  const loadNotifications = useCallback(() => {
    startTransition(async () => {
      const notifs = await getMyNotifications(20);
      setNotifications(notifs);
      const count = await getUnreadCount();
      setUnreadCount(count);
    });
  }, []);

  function toggleDropdown() {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (willOpen) loadNotifications();
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      );
    });
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={toggleDropdown}
        className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-coral text-[9px] font-bold text-black">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1e1e1e] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
            <h3 className="text-[14px] font-bold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="flex items-center gap-1 text-[11px] font-medium text-coral transition-colors hover:text-coral/80"
              >
                <CheckCheck className="size-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="mx-auto size-6 text-muted-foreground/30" />
                <p className="mt-2 text-[13px] text-muted-foreground">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div className="space-y-0.5 p-1.5">
                {notifications.map((n) => (
                  <NotificationItem key={n.$id} notification={n} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
