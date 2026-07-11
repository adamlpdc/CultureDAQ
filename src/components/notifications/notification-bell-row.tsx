"use client";

import { ChevronRight } from "lucide-react";
import {
  getNotificationIcon,
  getNotificationMessagePreview,
  type NotificationDisplay,
} from "@/lib/notifications";
import { cn, formatRelativeTime } from "@/lib/utils";

interface NotificationBellRowProps {
  notification: NotificationDisplay;
  onActivate: (notification: NotificationDisplay) => void;
  disabled?: boolean;
}

export function NotificationBellRow({
  notification,
  onActivate,
  disabled,
}: NotificationBellRowProps) {
  return (
    <button
      type="button"
      onClick={() => onActivate(notification)}
      disabled={disabled}
      className={cn(
        "group flex w-full gap-3 px-3.5 py-3 text-left transition-colors hover:bg-surface-muted",
        !notification.is_read && "bg-primary-light/30"
      )}
    >
      <span className="mt-0.5 shrink-0 text-base" aria-hidden>
        {getNotificationIcon(notification.type)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted">
          {getNotificationMessagePreview(notification)}
        </p>
        <p className="mt-1 text-[10px] font-medium text-muted-light">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
        {!notification.is_read && (
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
        )}
        <ChevronRight
          className="h-4 w-4 text-muted-light transition-colors group-hover:text-primary"
          aria-hidden
        />
      </div>
    </button>
  );
}
