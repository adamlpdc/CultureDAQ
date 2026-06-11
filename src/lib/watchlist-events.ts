import type { AssetRankMovement } from "@/types/database";
import {
  detectSignificantRankEvent,
  type SignificantRankEvent,
} from "@/lib/rank-significance";
import type { WatchlistItemWithAsset } from "@/lib/watchlist";
import { getPriceChange } from "@/lib/utils";

/** Labels ready for in-app, email, and push notifications */
export type WatchlistNotificationLabel =
  | "entered_top_50"
  | "entered_top_25"
  | "entered_top_10"
  | "entered_top_5"
  | "reached_number_one"
  | "dropped_out_of_top_10"
  | "dropped_out_of_top_25"
  | "dropped_out_of_top_50"
  | "lost_number_one"
  | "ranked_up"
  | "ranked_down"
  | "price_surge"
  | "price_drop"
  | "steady";

export interface WatchlistAssetEvent {
  /** Short label for movers UI (e.g. "Entered Top 10") */
  displayLabel: string;
  /** Future notification headline (e.g. "Watchlist Event: Entered Top 10") */
  notificationLabel: string;
  notificationType: WatchlistNotificationLabel;
  priority: number;
  isPositive: boolean;
}

const MILESTONE_TO_NOTIFICATION: Record<
  SignificantRankEvent["milestone"],
  WatchlistNotificationLabel
> = {
  reached_number_one: "reached_number_one",
  entered_top_5: "entered_top_5",
  entered_top_10: "entered_top_10",
  entered_top_25: "entered_top_25",
  entered_top_50: "entered_top_50",
  lost_number_one: "lost_number_one",
  dropped_out_of_top_10: "dropped_out_of_top_10",
  dropped_out_of_top_25: "dropped_out_of_top_25",
  dropped_out_of_top_50: "dropped_out_of_top_50",
};

export function formatWatchlistCount(count: number): string {
  if (count === 0) return "No assets tracked";
  if (count === 1) return "Watching 1 Asset";
  return `Watching ${count} Assets`;
}

export function formatWatchlistCountShort(count: number): string {
  if (count === 0) return "0 Assets Tracked";
  if (count === 1) return "1 Asset Tracked";
  return `${count} Assets Tracked`;
}

export function formatWatchingSince(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function resolveWatchlistAssetEvent(
  item: WatchlistItemWithAsset,
  movement?: AssetRankMovement | null
): WatchlistAssetEvent | null {
  const priceChange = getPriceChange(
    item.asset.current_price,
    item.asset.previous_price
  );

  if (movement?.previousRank != null && movement.rankChange != null) {
    const significant = detectSignificantRankEvent(
      movement.previousRank,
      movement.rank
    );
    if (significant) {
      return {
        displayLabel: significant.headline,
        notificationLabel: `Watchlist Event: ${significant.headline}`,
        notificationType: MILESTONE_TO_NOTIFICATION[significant.milestone],
        priority: significant.priority,
        isPositive: significant.isPositive,
      };
    }

    const places = Math.abs(movement.rankChange);
    if (places >= 3) {
      const label =
        movement.rankChange > 0
          ? `Ranked Up ${places} Places`
          : `Ranked Down ${places} Places`;
      return {
        displayLabel: label,
        notificationLabel: `Watchlist Event: ${label}`,
        notificationType:
          movement.rankChange > 0 ? "ranked_up" : "ranked_down",
        priority: 20 + places,
        isPositive: movement.rankChange > 0,
      };
    }
  }

  if (priceChange >= 10) {
    return {
      displayLabel: `+${priceChange.toFixed(1)}% Today`,
      notificationLabel: `Watchlist Event: +${priceChange.toFixed(1)}% Today`,
      notificationType: "price_surge",
      priority: 30,
      isPositive: true,
    };
  }

  if (priceChange <= -10) {
    return {
      displayLabel: `${priceChange.toFixed(1)}% Today`,
      notificationLabel: `Watchlist Event: ${priceChange.toFixed(1)}% Today`,
      notificationType: "price_drop",
      priority: 31,
      isPositive: false,
    };
  }

  return null;
}

export interface WatchlistMoverEntry {
  item: WatchlistItemWithAsset;
  movement: AssetRankMovement | null;
  priceChange: number;
  event: WatchlistAssetEvent | null;
  /** Sort score — lower = more interesting */
  interestScore: number;
}

export function buildWatchlistMovers(
  items: WatchlistItemWithAsset[],
  rankMovements: Map<string, AssetRankMovement>
): WatchlistMoverEntry[] {
  const entries: WatchlistMoverEntry[] = items.map((item) => {
    const movement = rankMovements.get(item.asset_id) ?? null;
    const priceChange = getPriceChange(
      item.asset.current_price,
      item.asset.previous_price
    );
    const event = resolveWatchlistAssetEvent(item, movement);

    let interestScore = 100;
    if (event) {
      interestScore = event.priority;
    } else if (movement?.rankChange) {
      interestScore = 40 - Math.abs(movement.rankChange);
    } else {
      interestScore = 50 - Math.abs(priceChange);
    }

    return { item, movement, priceChange, event, interestScore };
  });

  const withActivity = entries.filter(
    (e) =>
      e.event != null ||
      (e.movement?.rankChange != null && e.movement.rankChange !== 0) ||
      Math.abs(e.priceChange) >= 0.25
  );

  const pool = withActivity.length > 0 ? withActivity : entries;
  return [...pool].sort((a, b) => a.interestScore - b.interestScore).slice(0, 5);
}

/** Compact rank change for movers row (numeric arrows) */
export function formatMoverRankChange(
  movement: AssetRankMovement | null
): string | null {
  if (!movement?.rankChange || movement.rankChange === 0) return null;
  const n = Math.abs(movement.rankChange);
  return movement.rankChange > 0 ? `▲ ${n}` : `▼ ${n}`;
}
