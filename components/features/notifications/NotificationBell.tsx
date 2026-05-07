"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import Link from "next/link";
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
        try {
          const count = await getUnreadCount();
          setUnreadCount(count);
        } catch {
          // Non-critical — session may not be ready yet (e.g. post-login redirect)
        }
      });
    }
  }, []);

  // Poll unread count every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(async () => {
        try {
          const count = await getUnreadCount();
          setUnreadCount(count);
        } catch {
          // Silently ignore polling failures
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load notifications when dropdown opens
  const loadNotifications = useCallback(() => {
    startTransition(async () => {
      try {
        const { notifications: notifs } = await getMyNotifications(20);
        setNotifications(notifs);
        const count = await getUnreadCount();
        setUnreadCount(count);
      } catch {
        // Non-critical — degrade gracefully
      }
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
      try {
        await markAllAsRead();
        setUnreadCount(0);
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
        );
      } catch {
        // Non-critical — user can retry
      }
    });
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={toggleDropdown}
        className="relative rounded-lg p-1.5 text-muted-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-coral text-[8px] font-bold text-white ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl sm:w-80 lg:bottom-full lg:left-0 lg:right-auto lg:top-auto lg:mt-0 lg:mb-2">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-base font-bold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="flex items-center gap-1 text-sm font-medium text-coral transition-colors hover:text-coral/80"
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
                <p className="mt-2 text-base text-muted-foreground">
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

          {/* View all link */}
          <Link
            href="/dashboard/notifications"
            className="block border-t border-border py-2.5 text-center text-base font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            onClick={() => setIsOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
