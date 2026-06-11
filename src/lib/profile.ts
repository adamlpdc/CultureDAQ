import type { Achievement } from "@/types/database";
import { getAchievementLevel, type AchievementLevelInfo } from "@/lib/achievement-level";
import { buildAssetRankMap } from "@/lib/achievements/unlock";
import {
  buildPlayerIdentityMeta,
  computeDaysActive,
  getRecentAchievements,
  resolveFavoriteAchievementCard,
  resolveFavoriteAsset,
  type FavoriteAsset,
  type PlayerIdentityMeta,
  type PlayerStats,
} from "@/lib/profile-identity";
import { createClient } from "@/lib/supabase/server";
import {
  getAchievementsPageData,
  getPortfolioSummary,
  getProfile,
  getUserHoldings,
  getUserPortfolioRank,
  type AchievementCardData,
  type AchievementsPageData,
  type UserAchievementStats,
} from "@/lib/queries";
import { getWatchlistCount } from "@/lib/watchlist";
import type { TradeWithAsset } from "@/types/database";

export interface ProfilePageData {
  profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>;
  email: string;
  identity: PlayerIdentityMeta;
  portfolioValue: number;
  portfolioRank: number | null;
  achievementLevel: AchievementLevelInfo;
  playerStats: PlayerStats;
  achievementStats: UserAchievementStats;
  achievements: AchievementsPageData;
  favoriteAchievement: Achievement | null;
  favoriteAchievementCard: AchievementCardData | null;
  favoriteAsset: FavoriteAsset | null;
  recentAchievements: AchievementCardData[];
}

export async function getProfilePageData(
  userId: string,
  email: string
): Promise<ProfilePageData | null> {
  const supabase = await createClient();

  const [
    profile,
    summary,
    portfolioRank,
    achievements,
    watchlistCount,
    holdings,
    tradeCountResult,
    recentBuyResult,
  ] = await Promise.all([
    getProfile(userId),
    getPortfolioSummary(userId),
    getUserPortfolioRank(userId),
    getAchievementsPageData(userId),
    getWatchlistCount(supabase, userId),
    getUserHoldings(userId),
    supabase
      .from("trades")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("trades")
      .select("*, asset:assets(*)")
      .eq("user_id", userId)
      .eq("trade_type", "buy")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!profile || !summary) return null;

  const rankMap = await buildAssetRankMap(supabase);
  const recentBuy = recentBuyResult.data as TradeWithAsset | null;
  const favoriteAchievementCard = resolveFavoriteAchievementCard(
    achievements.cards,
    profile.favorite_achievement_id
  );

  const tradesCompleted = tradeCountResult.count ?? 0;
  const daysActive = computeDaysActive(profile.created_at);

  return {
    profile,
    email,
    identity: buildPlayerIdentityMeta(userId, profile.username),
    portfolioValue: summary.total_value,
    portfolioRank,
    achievementLevel: getAchievementLevel(achievements.stats.achievementScore),
    playerStats: {
      tradesCompleted,
      daysActive,
      watchlistCount,
      assetsOwned: summary.holdings_count,
      achievementsUnlocked: achievements.stats.earnedCount,
    },
    achievementStats: achievements.stats,
    achievements,
    favoriteAchievement: favoriteAchievementCard?.achievement ?? null,
    favoriteAchievementCard,
    favoriteAsset: resolveFavoriteAsset(holdings, recentBuy, rankMap),
    recentAchievements: getRecentAchievements(achievements.cards),
  };
}
