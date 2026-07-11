"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markNotificationRead } from "@/actions/notifications";
import {
  getNotificationHref,
  type NotificationDisplay,
} from "@/lib/notifications";

export function useNotificationNavigation(onAfterNavigate?: () => void) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function activateNotification(
    notification: NotificationDisplay,
    onReadLocal?: (id: string) => void
  ) {
    const href = getNotificationHref(notification);

    startTransition(async () => {
      if (!notification.is_read) {
        const result = await markNotificationRead(notification.id);
        if (result.success) {
          onReadLocal?.(notification.id);
        }
      }

      onAfterNavigate?.();
      router.push(href);
      router.refresh();
    });
  }

  return { activateNotification, isPending };
}
