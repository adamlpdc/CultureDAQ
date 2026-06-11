"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Bell } from "lucide-react";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/actions/notifications";
import {
  getNotificationIcon,
  getNotificationTypeLabel,
} from "@/lib/notifications";
import type { Notification } from "@/types/database";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NotificationBellProps {
  initialUnreadCount: number;
  initialNotifications: Notification[];
  className?: string;
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!notification.is_read) onRead(notification.id);
      }}
      className={cn(
        "flex w-full gap-3 px-3.5 py-3 text-left transition-colors hover:bg-surface-muted",
        !notification.is_read && "bg-primary-light/30"
      )}
    >
      <span className="mt-0.5 shrink-0 text-base" aria-hidden>
        {getNotificationIcon(notification.type)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted">
          {getNotificationTypeLabel(notification.type)}
        </p>
        <p className="mt-1 text-[10px] font-medium text-muted-light">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>
      {!notification.is_read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  );
}

function NotificationDropdownPanel({
  notifications,
  unreadCount,
  isPending,
  onClose,
  onMarkRead,
  onMarkAllRead,
}: {
  notifications: Notification[];
  unreadCount: number;
  isPending: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}) {
  const hasNotifications = notifications.length > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card-hover">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <p className="text-sm font-bold text-foreground">Notifications</p>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={isPending}
            className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-60"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto sm:max-h-80">
        {hasNotifications ? (
          notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onRead={onMarkRead}
            />
          ))
        ) : (
          <div className="px-3.5 py-5 text-center">
            <p className="text-sm font-semibold text-foreground">No notifications yet</p>
            <Link
              href="/notifications"
              onClick={onClose}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              View all notifications
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>

      {hasNotifications && (
        <div className="border-t border-border p-2">
          <Link href="/notifications" onClick={onClose}>
            <Button variant="secondary" size="sm" className="w-full text-xs font-semibold">
              View all notifications
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export function NotificationBell({
  initialUnreadCount,
  initialNotifications,
  className,
}: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  function handleOpen() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      startTransition(async () => {
        const fresh = await fetchNotifications({ limit: 8 });
        setNotifications(fresh);
      });
    }
  }

  function handleClose() {
    setOpen(false);
  }

  function handleMarkRead(id: string) {
    startTransition(async () => {
      const result = await markNotificationRead(id);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        router.refresh();
      }
    });
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={handleOpen}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className={cn(
          "relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-muted text-muted shadow-card transition-colors hover:bg-surface hover:text-foreground",
          open && "border-border-tint bg-surface text-foreground"
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "z-[60]",
            "max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:top-[4.25rem]",
            "sm:absolute sm:right-0 sm:mt-2 sm:w-[min(100vw-2rem,22rem)]"
          )}
        >
          <NotificationDropdownPanel
            notifications={notifications}
            unreadCount={unreadCount}
            isPending={isPending}
            onClose={handleClose}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
          />
        </div>
      )}
    </div>
  );
}
