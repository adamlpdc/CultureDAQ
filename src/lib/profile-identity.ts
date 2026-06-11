import type { Asset, HoldingWithAsset, TradeWithAsset } from "@/types/database";
import type { AchievementCardData } from "@/lib/queries";

/** Reserved fields for leagues, seasons, and public profiles — not wired yet */
export interface PlayerIdentityMeta {
  userId: string;
  username: string;
  /** URL slug for future /player/[username] public profiles */
  slug: string;
  /** @future League membership id */
  leagueId?: string | null;
  /** @future Seasonal leaderboard rank */
  seasonRank?: number | null;
  /** @future Whether profile is publicly viewable */
  isPublic?: boolean;
}

export interface PlayerStats {
  tradesCompleted: number;
  daysActive: number;
  watchlistCount: number;
  assetsOwned: number;
  achievementsUnlocked: number;
}

export interface FavoriteAsset {
  asset: Asset;
  shares: number;
  currentValue: number;
  rank: number | null;
  /** True when derived from most recent buy (no current holdings) */
  isRecentPurchaseFallback: boolean;
}

export function computeDaysActive(createdAt: string): number {
  const joined = new Date(createdAt).getTime();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((now - joined) / dayMs));
}

export function buildPlayerIdentityMeta(
  userId: string,
  username: string
): PlayerIdentityMeta {
  return {
    userId,
    username,
    slug: username.toLowerCase(),
    leagueId: null,
    seasonRank: null,
    isPublic: false,
  };
}

export function resolveFavoriteAsset(
  holdings: HoldingWithAsset[],
  recentBuy: TradeWithAsset | null,
  rankMap: Map<string, number>
): FavoriteAsset | null {
  const active = holdings.filter((h) => h.shares > 0);

  if (active.length > 0) {
    const best = active.reduce((top, h) => {
      const value = h.shares * Number(h.asset.current_price);
      const topValue = top.shares * Number(top.asset.current_price);
      return value > topValue ? h : top;
    });

    return {
      asset: best.asset,
      shares: best.shares,
      currentValue: best.shares * Number(best.asset.current_price),
      rank: rankMap.get(best.asset_id) ?? null,
      isRecentPurchaseFallback: false,
    };
  }

  if (recentBuy?.asset) {
    const holding = holdings.find((h) => h.asset_id === recentBuy.asset_id);
    const shares = holding?.shares ?? recentBuy.shares;
    return {
      asset: recentBuy.asset,
      shares,
      currentValue: shares * Number(recentBuy.asset.current_price),
      rank: rankMap.get(recentBuy.asset_id) ?? null,
      isRecentPurchaseFallback: true,
    };
  }

  return null;
}

export function resolveFavoriteAchievementCard(
  cards: AchievementCardData[],
  favoriteAchievementId: string | null | undefined
): AchievementCardData | null {
  if (favoriteAchievementId) {
    const match = cards.find(
      (c) => c.isUnlocked && c.achievement.id === favoriteAchievementId
    );
    if (match) return match;
  }

  const unlocked = cards.filter((c) => c.isUnlocked);
  if (unlocked.length === 0) return null;

  return unlocked.reduce((best, card) =>
    card.achievement.points > best.achievement.points ? card : best
  );
}

export function getRecentAchievements(
  cards: AchievementCardData[],
  limit = 5
): AchievementCardData[] {
  return cards
    .filter((c) => c.isUnlocked && c.unlockedAt)
    .sort(
      (a, b) =>
        new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime()
    )
    .slice(0, limit);
}
