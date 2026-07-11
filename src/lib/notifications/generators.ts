import type { SupabaseClient } from "@supabase/supabase-js";
import type { Asset, AssetRankMovement, CreateNotificationInput, HoldingWithAsset, MarketEvent, UnlockedAchievement } from "@/types/database";
import { detectSignificantRankEvent } from "@/lib/rank-significance";
import type { WatchlistItemWithAsset } from "@/lib/watchlist";
import { createNotificationsBatch } from "@/lib/notifications";
import { getPriceChange } from "@/lib/utils";

const PORTFOLIO_MILESTONES = [
  150_000, 250_000, 500_000, 1_000_000, 5_000_000, 10_000_000,
] as const;

const HOLDING_GAIN_THRESHOLDS = [10, 25, 50] as const;

export interface WatchlistNotificationCandidate {
  userId: string;
  assetId: string;
  assetName: string;
  title: string;
  message: string;
  dedupeKey: string;
  notificationType: "watchlist_alert" | "rank_event" | "market_event";
}

export interface LeaderboardNotificationCandidate {
  userId: string;
  title: string;
  message: string;
  dedupeKey: string;
}

export interface PortfolioNotificationCandidate {
  userId: string;
  assetId?: string;
  title: string;
  message: string;
  dedupeKey: string;
}

function formatMilestoneLabel(value: number): string {
  if (value >= 1_000_000) return `${value / 1_000_000}M DAQ`;
  return `${Math.round(value / 1000)}k DAQ`;
}

/** Stricter thresholds for notification delivery (not UI movers). */
export function evaluateWatchlistNotification(
  item: WatchlistItemWithAsset,
  movement?: AssetRankMovement | null
): WatchlistNotificationCandidate | null {
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
        userId: item.user_id,
        assetId: item.asset_id,
        assetName: item.asset.name,
        title: `${item.asset.name} ${significant.headline.toLowerCase()}`,
        message: significant.bullet,
        dedupeKey: `watchlist:${item.user_id}:${item.asset_id}:${significant.milestone}`,
        notificationType: significant.isPositive ? "rank_event" : "watchlist_alert",
      };
    }

    const places = Math.abs(movement.rankChange);
    if (places >= 10) {
      const direction = movement.rankChange > 0 ? "up" : "down";
      return {
        userId: item.user_id,
        assetId: item.asset_id,
        assetName: item.asset.name,
        title: `${item.asset.name} moved ${direction} ${places} places`,
        message: `Now ranked #${movement.rank} in the market.`,
        dedupeKey: `watchlist:${item.user_id}:${item.asset_id}:rank_${direction}_${places}:${movement.recordedAt?.slice(0, 10) ?? "day"}`,
        notificationType: "watchlist_alert",
      };
    }
  }

  if (priceChange >= 10) {
    return {
      userId: item.user_id,
      assetId: item.asset_id,
      assetName: item.asset.name,
      title: `${item.asset.name} is up ${priceChange.toFixed(1)}% today`,
      message: `Watchlist alert — significant price movement in the last 24 hours.`,
      dedupeKey: `watchlist:${item.user_id}:${item.asset_id}:gain_10:${new Date().toISOString().slice(0, 10)}`,
      notificationType: "watchlist_alert",
    };
  }

  if (priceChange <= -10) {
    return {
      userId: item.user_id,
      assetId: item.asset_id,
      assetName: item.asset.name,
      title: `${item.asset.name} is down ${Math.abs(priceChange).toFixed(1)}% today`,
      message: `Watchlist alert — significant price drop in the last 24 hours.`,
      dedupeKey: `watchlist:${item.user_id}:${item.asset_id}:loss_10:${new Date().toISOString().slice(0, 10)}`,
      notificationType: "watchlist_alert",
    };
  }

  return null;
}

export function evaluateMarketEventNotification(
  userId: string,
  asset: Asset,
  event: MarketEvent
): WatchlistNotificationCandidate | null {
  if (event.impact_score < 3) return null;

  return {
    userId,
    assetId: asset.id,
    assetName: asset.name,
    title: `${asset.name}: ${event.headline}`,
    message: event.description,
    dedupeKey: `watchlist:${userId}:${asset.id}:market_event:${event.id}`,
    notificationType: "market_event",
  };
}

export function evaluateLeaderboardNotification(
  userId: string,
  previousRank: number | null,
  currentRank: number
): LeaderboardNotificationCandidate | null {
  if (previousRank == null) return null;
  if (previousRank === currentRank) return null;

  if (currentRank === 1 && previousRank > 1) {
    return {
      userId,
      title: "You reached #1",
      message: "You're at the top of the CultureDAQ leaderboard.",
      dedupeKey: `leaderboard:${userId}:reached_number_one`,
    };
  }

  if (previousRank > 10 && currentRank <= 10) {
    return {
      userId,
      title: "You entered the Top 10",
      message: `You climbed to #${currentRank} on the leaderboard.`,
      dedupeKey: `leaderboard:${userId}:entered_top_10`,
    };
  }

  if (previousRank > 25 && currentRank <= 25) {
    return {
      userId,
      title: "You entered the Top 25",
      message: `You climbed to #${currentRank} on the leaderboard.`,
      dedupeKey: `leaderboard:${userId}:entered_top_25`,
    };
  }

  if (previousRank > 100 && currentRank <= 100) {
    return {
      userId,
      title: "You entered the Top 100",
      message: `You climbed to #${currentRank} on the leaderboard.`,
      dedupeKey: `leaderboard:${userId}:entered_top_100`,
    };
  }

  if (previousRank === 1 && currentRank > 1) {
    return {
      userId,
      title: "You lost #1",
      message: `You're now ranked #${currentRank} on the leaderboard.`,
      dedupeKey: `leaderboard:${userId}:lost_number_one:${new Date().toISOString().slice(0, 10)}`,
    };
  }

  const rankChange = previousRank - currentRank;
  if (Math.abs(rankChange) > 10) {
    const direction = rankChange > 0 ? "up" : "down";
    return {
      userId,
      title: `You moved ${direction} ${Math.abs(rankChange)} places`,
      message: `You're now ranked #${currentRank} on the leaderboard.`,
      dedupeKey: `leaderboard:${userId}:move_${direction}_${Math.abs(rankChange)}:${new Date().toISOString().slice(0, 10)}`,
    };
  }

  return null;
}

export function evaluatePortfolioMilestoneNotification(
  userId: string,
  previousTotal: number,
  currentTotal: number
): PortfolioNotificationCandidate | null {
  for (const milestone of PORTFOLIO_MILESTONES) {
    if (previousTotal < milestone && currentTotal >= milestone) {
      return {
        userId,
        title: `Portfolio value reached ${formatMilestoneLabel(milestone)}`,
        message: `Your total portfolio value (cash + holdings) crossed ${formatMilestoneLabel(milestone)}.`,
        dedupeKey: `portfolio:${userId}:milestone:${milestone}`,
      };
    }
  }
  return null;
}

export function evaluateHoldingGainNotifications(
  userId: string,
  holding: HoldingWithAsset
): PortfolioNotificationCandidate[] {
  if (holding.shares <= 0 || holding.avg_cost <= 0) return [];

  const gainPct =
    ((holding.asset.current_price - holding.avg_cost) / holding.avg_cost) * 100;
  if (gainPct < 10) return [];

  const results: PortfolioNotificationCandidate[] = [];
  for (const threshold of HOLDING_GAIN_THRESHOLDS) {
    if (gainPct >= threshold) {
      results.push({
        userId,
        assetId: holding.asset_id,
        title: `${holding.asset.name} is up ${gainPct.toFixed(0)}% since purchase`,
        message: `Your position has gained ${gainPct.toFixed(1)}% since you bought in.`,
        dedupeKey: `portfolio:${userId}:${holding.asset_id}:gain_${threshold}`,
      });
    }
  }
  return results;
}

export function buildAchievementNotificationInput(
  userId: string,
  achievement: UnlockedAchievement,
  achievementDbId: string,
  description?: string
): CreateNotificationInput {
  return {
    userId,
    type: "achievement_unlocked",
    title: achievement.name,
    message: description
      ? `${description} — +${achievement.points} pts`
      : `Achievement unlocked — +${achievement.points} pts`,
    achievementId: achievementDbId,
    dedupeKey: `achievement:${userId}:${achievement.code}`,
  };
}

export async function processWatchlistNotifications(
  supabase: SupabaseClient,
  items: WatchlistItemWithAsset[],
  rankMovements: Map<string, AssetRankMovement>,
  recentMarketEvents: MarketEvent[]
): Promise<number> {
  const inputs: CreateNotificationInput[] = [];

  for (const item of items) {
    const movement = rankMovements.get(item.asset_id) ?? null;
    const candidate = evaluateWatchlistNotification(item, movement);
    if (candidate) {
      inputs.push({
        userId: candidate.userId,
        type: candidate.notificationType,
        title: candidate.title,
        message: candidate.message,
        assetId: candidate.assetId,
        dedupeKey: candidate.dedupeKey,
      });
    }

    for (const event of recentMarketEvents) {
      if (event.asset_id !== item.asset_id) continue;
      const marketCandidate = evaluateMarketEventNotification(
        item.user_id,
        item.asset,
        event
      );
      if (marketCandidate) {
        inputs.push({
          userId: marketCandidate.userId,
          type: marketCandidate.notificationType,
          title: marketCandidate.title,
          message: marketCandidate.message,
          assetId: marketCandidate.assetId,
          dedupeKey: marketCandidate.dedupeKey,
        });
      }
    }
  }

  return createNotificationsBatch(supabase, inputs);
}

export async function processLeaderboardNotifications(
  supabase: SupabaseClient,
  ranked: Array<{ user_id: string; rank: number }>,
  previousRankMap: Map<string, number>
): Promise<number> {
  const inputs: CreateNotificationInput[] = [];

  for (const entry of ranked) {
    const previousRank = previousRankMap.get(entry.user_id) ?? null;
    const candidate = evaluateLeaderboardNotification(
      entry.user_id,
      previousRank,
      entry.rank
    );
    if (candidate) {
      inputs.push({
        userId: candidate.userId,
        type: "leaderboard_event",
        title: candidate.title,
        message: candidate.message,
        dedupeKey: candidate.dedupeKey,
      });
    }
  }

  return createNotificationsBatch(supabase, inputs);
}

export async function processPortfolioNotifications(
  supabase: SupabaseClient,
  userId: string,
  previousTotal: number,
  currentTotal: number,
  holdings: HoldingWithAsset[]
): Promise<number> {
  const inputs: CreateNotificationInput[] = [];

  const milestone = evaluatePortfolioMilestoneNotification(
    userId,
    previousTotal,
    currentTotal
  );
  if (milestone) {
    inputs.push({
      userId: milestone.userId,
      type: "portfolio_event",
      title: milestone.title,
      message: milestone.message,
      dedupeKey: milestone.dedupeKey,
    });
  }

  for (const holding of holdings) {
    for (const gain of evaluateHoldingGainNotifications(userId, holding)) {
      inputs.push({
        userId: gain.userId,
        type: "portfolio_event",
        title: gain.title,
        message: gain.message,
        assetId: gain.assetId,
        dedupeKey: gain.dedupeKey,
      });
    }
  }

  return createNotificationsBatch(supabase, inputs);
}

export async function getPreviousLeaderboardRankMap(
  supabase: SupabaseClient
): Promise<Map<string, number>> {
  const { data: latestBatch } = await supabase
    .from("leaderboard_snapshots")
    .select("recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(1);

  const latestAt = latestBatch?.[0]?.recorded_at;
  if (!latestAt) return new Map();

  const { data: rows } = await supabase
    .from("leaderboard_snapshots")
    .select("user_id, rank")
    .eq("recorded_at", latestAt);

  return new Map((rows ?? []).map((r) => [r.user_id, r.rank]));
}

export async function getPreviousPortfolioTotal(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from("portfolio_snapshots")
    .select("total_value")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.total_value ?? 0;
}
