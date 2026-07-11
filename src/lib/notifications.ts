import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateNotificationInput,
  Notification,
  NotificationPreferences,
  NotificationType,
} from "@/types/database";
import {
  mapNotificationRow,
  type NotificationDisplay,
} from "@/lib/notifications/routing";

export type { NotificationDisplay } from "@/lib/notifications/routing";
export { getNotificationHref } from "@/lib/notifications/routing";

export function getNotificationMessagePreview(notification: Notification): string {
  const message = notification.message?.trim();
  if (message) return message;
  return getNotificationTypeLabel(notification.type);
}

export type NotificationTab =
  | "all"
  | "unread"
  | "achievements"
  | "watchlist"
  | "portfolio"
  | "leaderboard";

type NotificationPreferenceToggle =
  | "achievements_enabled"
  | "watchlist_enabled"
  | "leaderboard_enabled"
  | "portfolio_enabled"
  | "rank_events_enabled"
  | "market_events_enabled";

const TYPE_PREFERENCE_KEY: Partial<Record<NotificationType, NotificationPreferenceToggle>> = {
  achievement_unlocked: "achievements_enabled",
  watchlist_alert: "watchlist_enabled",
  rank_event: "rank_events_enabled",
  market_event: "market_events_enabled",
  portfolio_event: "portfolio_enabled",
  leaderboard_event: "leaderboard_enabled",
};

const DEFAULT_PREFERENCES: Omit<
  NotificationPreferences,
  "user_id" | "created_at" | "updated_at"
> = {
  achievements_enabled: true,
  watchlist_enabled: true,
  leaderboard_enabled: true,
  portfolio_enabled: true,
  rank_events_enabled: true,
  market_events_enabled: true,
  email_enabled: false,
  push_enabled: false,
};

export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case "achievement_unlocked":
      return "🏆";
    case "watchlist_alert":
      return "⭐";
    case "rank_event":
      return "📈";
    case "market_event":
      return "📊";
    case "portfolio_event":
      return "💼";
    case "leaderboard_event":
      return "🏅";
    case "system":
      return "ℹ️";
    default:
      return "🔔";
  }
}

export function getNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case "achievement_unlocked":
      return "Achievement unlocked";
    case "watchlist_alert":
      return "Watchlist alert";
    case "rank_event":
      return "Rank event";
    case "market_event":
      return "Market event";
    case "portfolio_event":
      return "Portfolio event";
    case "leaderboard_event":
      return "Leaderboard event";
    case "system":
      return "System";
    default:
      return "Notification";
  }
}

export function notificationMatchesTab(
  notification: Notification,
  tab: NotificationTab
): boolean {
  switch (tab) {
    case "all":
      return true;
    case "unread":
      return !notification.is_read;
    case "achievements":
      return notification.type === "achievement_unlocked";
    case "watchlist":
      return (
        notification.type === "watchlist_alert" ||
        notification.type === "rank_event" ||
        notification.type === "market_event"
      );
    case "portfolio":
      return notification.type === "portfolio_event";
    case "leaderboard":
      return notification.type === "leaderboard_event";
    default:
      return true;
  }
}

export async function getNotificationPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<Omit<NotificationPreferences, "user_id" | "created_at" | "updated_at">> {
  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return DEFAULT_PREFERENCES;
  return {
    achievements_enabled: data.achievements_enabled,
    watchlist_enabled: data.watchlist_enabled,
    leaderboard_enabled: data.leaderboard_enabled,
    portfolio_enabled: data.portfolio_enabled,
    rank_events_enabled: data.rank_events_enabled,
    market_events_enabled: data.market_events_enabled,
    email_enabled: data.email_enabled,
    push_enabled: data.push_enabled,
  };
}

async function isNotificationTypeEnabled(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType
): Promise<boolean> {
  if (type === "system") return true;
  const prefKey = TYPE_PREFERENCE_KEY[type];
  if (!prefKey) return true;
  const prefs = await getNotificationPreferences(supabase, userId);
  return prefs[prefKey] !== false;
}

export async function createNotification(
  supabase: SupabaseClient,
  input: CreateNotificationInput
): Promise<Notification | null> {
  const enabled = await isNotificationTypeEnabled(supabase, input.userId, input.type);
  if (!enabled) return null;

  if (input.dedupeKey) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", input.userId)
      .eq("dedupe_key", input.dedupeKey)
      .maybeSingle();

    if (existing) return null;
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      asset_id: input.assetId ?? null,
      achievement_id: input.achievementId ?? null,
      dedupe_key: input.dedupeKey ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") return null;
    throw new Error(error.message);
  }

  return data as Notification;
}

export async function createNotificationsBatch(
  supabase: SupabaseClient,
  inputs: CreateNotificationInput[]
): Promise<number> {
  let created = 0;
  for (const input of inputs) {
    const result = await createNotification(supabase, input);
    if (result) created++;
  }
  return created;
}

export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getUserNotifications(
  supabase: SupabaseClient,
  userId: string,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<NotificationDisplay[]> {
  let query = supabase
    .from("notifications")
    .select(
      `
      id,
      user_id,
      type,
      title,
      message,
      asset_id,
      achievement_id,
      is_read,
      dedupe_key,
      created_at,
      asset:assets(slug)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (options?.unreadOnly) {
    query = query.eq("is_read", false);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapNotificationRow(row as Parameters<typeof mapNotificationRow>[0]));
}

export async function markRead(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return true;
}

export async function markAllRead(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function deleteNotification(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return true;
}

export async function clearAllRead(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .eq("is_read", true)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
