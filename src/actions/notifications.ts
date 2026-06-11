"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/types/database";
import {
  clearAllRead,
  deleteNotification,
  getUnreadCount,
  getUserNotifications,
  markAllRead,
  markRead,
  notificationMatchesTab,
  type NotificationTab,
} from "@/lib/notifications";

const idSchema = z.string().uuid();

export type NotificationActionResult =
  | { success: true }
  | { success: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function revalidateNotificationPaths() {
  revalidatePath("/");
  revalidatePath("/notifications");
}

export async function fetchUnreadCount(): Promise<number> {
  const { supabase, user } = await requireUser();
  if (!user) return 0;
  return getUnreadCount(supabase, user.id);
}

export async function fetchNotifications(options?: {
  limit?: number;
  tab?: NotificationTab;
}): Promise<Notification[]> {
  const { supabase, user } = await requireUser();
  if (!user) return [];

  const tab = options?.tab ?? "all";
  const unreadOnly = tab === "unread";
  const notifications = await getUserNotifications(supabase, user.id, {
    limit: options?.limit ?? (tab === "all" ? 100 : 50),
    unreadOnly,
  });

  if (tab === "all" || tab === "unread") {
    return notifications;
  }

  return notifications.filter((n) => notificationMatchesTab(n, tab));
}

export async function markNotificationRead(
  notificationId: string
): Promise<NotificationActionResult> {
  const parsed = idSchema.safeParse(notificationId);
  if (!parsed.success) return { success: false, error: "Invalid notification" };

  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sign in required" };

  await markRead(supabase, user.id, parsed.data);
  revalidateNotificationPaths();
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sign in required" };

  await markAllRead(supabase, user.id);
  revalidateNotificationPaths();
  return { success: true };
}

export async function removeNotification(
  notificationId: string
): Promise<NotificationActionResult> {
  const parsed = idSchema.safeParse(notificationId);
  if (!parsed.success) return { success: false, error: "Invalid notification" };

  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sign in required" };

  await deleteNotification(supabase, user.id, parsed.data);
  revalidateNotificationPaths();
  return { success: true };
}

export async function clearReadNotifications(): Promise<NotificationActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sign in required" };

  await clearAllRead(supabase, user.id);
  revalidateNotificationPaths();
  return { success: true };
}
