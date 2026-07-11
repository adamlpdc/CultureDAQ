import type { Notification } from "@/types/database";

/** Notification row enriched with joined asset slug for deep links. */
export interface NotificationDisplay extends Notification {
  asset_slug: string | null;
}

type NotificationHrefInput = Pick<
  Notification,
  "type" | "asset_id"
> & {
  asset_slug?: string | null;
};

/**
 * Resolve in-app destination for a notification click.
 * Safe for client and server — no extra fetches.
 */
export function getNotificationHref(notification: NotificationHrefInput): string {
  if (notification.asset_id && notification.asset_slug) {
    return `/asset/${notification.asset_slug}`;
  }

  switch (notification.type) {
    case "achievement_unlocked":
      return "/achievements";
    case "leaderboard_event":
      return "/leaderboard";
    case "portfolio_event":
      return "/portfolio";
    case "system":
      return "/market";
    default:
      if (notification.asset_id) return "/market";
      return "/notifications";
  }
}

type NotificationRowWithAsset = Notification & {
  asset?: { slug: string } | { slug: string }[] | null;
};

export function mapNotificationRow(row: NotificationRowWithAsset): NotificationDisplay {
  const { asset, ...notification } = row;
  const assetRecord = Array.isArray(asset) ? asset[0] : asset;
  return {
    ...(notification as Notification),
    asset_slug: assetRecord?.slug ?? null,
  };
}
