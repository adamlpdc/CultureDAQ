"use client";

import { ChevronRight } from "lucide-react";
import {
  getNotificationIcon,
  getNotificationTypeLabel,
  type NotificationDisplay,
} from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";

interface NotificationPageRowProps {
  notification: NotificationDisplay;
  onActivate: (notification: NotificationDisplay) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

export function NotificationPageRow({
  notification,
  onActivate,
  onMarkRead,
  onDelete,
  disabled,
}: NotificationPageRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between",
        !notification.is_read && "bg-primary-light/20"
      )}
    >
      <button
        type="button"
        onClick={() => onActivate(notification)}
        disabled={disabled}
        className="group flex min-w-0 flex-1 gap-3 text-left transition-colors"
      >
        <span className="mt-0.5 shrink-0 text-lg" aria-hidden>
          {getNotificationIcon(notification.type)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm font-bold text-foreground group-hover:text-primary">
              {notification.title}
            </p>
            <ChevronRight
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-light transition-colors group-hover:text-primary"
              aria-hidden
            />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {notification.message}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-muted-light">
            <span>{getNotificationTypeLabel(notification.type)}</span>
            <span>·</span>
            <span>{formatRelativeTime(notification.created_at)}</span>
          </div>
        </div>
      </button>
      <div className="flex shrink-0 gap-2 sm:flex-col">
        {!notification.is_read && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onMarkRead(notification.id);
            }}
            disabled={disabled}
            className="text-xs"
          >
            Mark read
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(notification.id);
          }}
          disabled={disabled}
          className="text-xs text-muted"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
