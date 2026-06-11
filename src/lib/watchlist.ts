import type { SupabaseClient } from "@supabase/supabase-js";
import type { Asset, AssetRankMovement, WatchlistItem } from "@/types/database";
import { detectSignificantRankEvent } from "@/lib/rank-significance";
import { getPriceChange } from "@/lib/utils";

export interface WatchlistItemWithAsset extends WatchlistItem {
  asset: Asset;
}

export interface WatchlistAnalytics {
  count: number;
  biggestGainer: WatchlistItemWithAsset | null;
  biggestLoser: WatchlistItemWithAsset | null;
  highestRanked: WatchlistItemWithAsset | null;
  bestPerforming: WatchlistItemWithAsset | null;
  biggestRankGainer: WatchlistItemWithAsset | null;
  /** False when count < 2 — gainer/loser cards are redundant */
  showMoverComparison: boolean;
}

/** Future notification triggers — wire to push/email when ready */
export type WatchlistNotificationTrigger =
  | "price_surge_10pct"
  | "entered_top_10"
  | "new_price_high"
  | "major_market_event";

export interface WatchlistNotificationCandidate {
  userId: string;
  assetId: string;
  trigger: WatchlistNotificationTrigger;
  headline: string;
}

/**
 * Evaluate whether a watched asset should notify the user.
 * Not wired to delivery yet — call from cron or event handlers later.
 */
export function evaluateWatchlistNotificationTriggers(
  item: WatchlistItemWithAsset,
  rankMovement?: AssetRankMovement | null,
  options?: { priceSurgeThresholdPct?: number }
): WatchlistNotificationCandidate[] {
  const threshold = options?.priceSurgeThresholdPct ?? 10;
  const change = getPriceChange(
    item.asset.current_price,
    item.asset.previous_price
  );
  const candidates: WatchlistNotificationCandidate[] = [];

  if (change >= threshold) {
    candidates.push({
      userId: item.user_id,
      assetId: item.asset_id,
      trigger: "price_surge_10pct",
      headline: `Watchlist Event: +${change.toFixed(1)}% Today`,
    });
  }

  if (rankMovement?.previousRank != null) {
    const significant = detectSignificantRankEvent(
      rankMovement.previousRank,
      rankMovement.rank
    );
    if (significant) {
      candidates.push({
        userId: item.user_id,
        assetId: item.asset_id,
        trigger: "entered_top_10",
        headline: `Watchlist Event: ${significant.headline}`,
      });
    }
  }

  if (item.asset.current_price > item.asset.previous_price) {
    candidates.push({
      userId: item.user_id,
      assetId: item.asset_id,
      trigger: "new_price_high",
      headline: `${item.asset.name} reached a new session high`,
    });
  }

  return candidates;
}

/** Achievement prep: Watchful Trader — count watched assets */
export async function getWatchlistCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("watchlist_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Achievement prep: Market Observer — did user watch before asset entered Top 25?
 */
export async function didUserWatchBeforeRank(
  supabase: SupabaseClient,
  userId: string,
  assetId: string,
  targetRank: number
): Promise<boolean> {
  const { data: watchRow } = await supabase
    .from("watchlist_items")
    .select("created_at")
    .eq("user_id", userId)
    .eq("asset_id", assetId)
    .maybeSingle();

  if (!watchRow) return false;

  const { data: rankRow } = await supabase
    .from("asset_rank_history")
    .select("recorded_at")
    .eq("asset_id", assetId)
    .lte("rank", targetRank)
    .order("recorded_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!rankRow) return false;
  return watchRow.created_at <= rankRow.recorded_at;
}

export async function getUserWatchlist(
  supabase: SupabaseClient,
  userId: string
): Promise<WatchlistItemWithAsset[]> {
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("*, asset:assets(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...(row as WatchlistItem),
    asset: (row as { asset: Asset }).asset,
  }));
}

export async function getUserWatchlistAssetIds(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("asset_id")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => row.asset_id));
}

export async function isAssetWatched(
  supabase: SupabaseClient,
  userId: string,
  assetId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("id")
    .eq("user_id", userId)
    .eq("asset_id", assetId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data != null;
}

export function computeWatchlistAnalytics(
  items: WatchlistItemWithAsset[],
  rankMovements?: Map<string, AssetRankMovement>
): WatchlistAnalytics {
  if (items.length === 0) {
    return {
      count: 0,
      biggestGainer: null,
      biggestLoser: null,
      highestRanked: null,
      bestPerforming: null,
      biggestRankGainer: null,
      showMoverComparison: false,
    };
  }

  let biggestGainer: WatchlistItemWithAsset | null = null;
  let biggestGainerChange = -Infinity;
  let biggestLoser: WatchlistItemWithAsset | null = null;
  let biggestLoserChange = Infinity;
  let highestRanked: WatchlistItemWithAsset | null = null;
  let highestRank = Infinity;
  let biggestRankGainer: WatchlistItemWithAsset | null = null;
  let biggestRankChange = -Infinity;

  for (const item of items) {
    const change = getPriceChange(
      item.asset.current_price,
      item.asset.previous_price
    );
    if (change > biggestGainerChange) {
      biggestGainerChange = change;
      biggestGainer = item;
    }
    if (change < biggestLoserChange) {
      biggestLoserChange = change;
      biggestLoser = item;
    }

    const movement = rankMovements?.get(item.asset_id);
    const rank = movement?.rank;
    if (rank != null && rank < highestRank) {
      highestRank = rank;
      highestRanked = item;
    }
    const rankChange = movement?.rankChange ?? 0;
    if (rankChange > biggestRankChange) {
      biggestRankChange = rankChange;
      biggestRankGainer = item;
    }
  }

  return {
    count: items.length,
    biggestGainer,
    biggestLoser,
    highestRanked,
    bestPerforming: biggestGainer,
    biggestRankGainer: biggestRankChange > 0 ? biggestRankGainer : null,
    showMoverComparison: items.length >= 2,
  };
}
