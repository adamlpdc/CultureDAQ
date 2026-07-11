"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  clearReadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  removeNotification,
} from "@/actions/notifications";
import {
  notificationMatchesTab,
  type NotificationDisplay,
  type NotificationTab,
} from "@/lib/notifications";
import { NotificationPageRow } from "@/components/notifications/notification-page-row";
import { useNotificationNavigation } from "@/components/notifications/use-notification-navigation";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS: { id: NotificationTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "achievements", label: "Achievements" },
  { id: "watchlist", label: "Watchlist" },
  { id: "portfolio", label: "Portfolio" },
  { id: "leaderboard", label: "Leaderboard" },
];

interface NotificationsPageContentProps {
  notifications: NotificationDisplay[];
}

export function NotificationsPageContent({
  notifications: initialNotifications,
}: NotificationsPageContentProps) {
  const router = useRouter();
  const [tab, setTab] = useState<NotificationTab>("all");
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isPending, startTransition] = useTransition();
  const { activateNotification, isPending: isNavigatePending } =
    useNotificationNavigation();
  const busy = isPending || isNavigatePending;

  const filtered = useMemo(
    () => notifications.filter((n) => notificationMatchesTab(n, tab)),
    [notifications, tab]
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  function handleMarkRead(id: string) {
    startTransition(async () => {
      const result = await markNotificationRead(id);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await removeNotification(id);
      if (result.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        router.refresh();
      }
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        router.refresh();
      }
    });
  }

  function handleClearRead() {
    startTransition(async () => {
      const result = await clearReadNotifications();
      if (result.success) {
        setNotifications((prev) => prev.filter((n) => !n.is_read));
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Notifications"
          description="Important events from your portfolio, watchlist and achievements."
        />
        <div className="flex flex-wrap gap-2">
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearRead}
            disabled={isPending}
            className="text-xs"
          >
            Clear all read
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              tab === t.id
                ? "bg-primary-light text-primary"
                : "text-muted hover:bg-surface-muted hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-surface shadow-card">
        {notifications.length === 0 ? (
          <div className="p-4 md:p-6">
            <EmptyState
              icon={Bell}
              title="No notifications yet"
              description="Watch assets, trade, unlock achievements and climb the leaderboard to receive updates."
              action={
                <Link href="/market">
                  <Button size="sm">Explore Market</Button>
                </Link>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            {tab === "unread"
              ? "You're all caught up."
              : "No notifications in this category yet."}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((notification) => (
              <NotificationPageRow
                key={notification.id}
                notification={notification}
                disabled={busy}
                onActivate={(item) =>
                  activateNotification(item, (id) => {
                    setNotifications((prev) =>
                      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
                    );
                  })
                }
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
