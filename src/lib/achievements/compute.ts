import {
  ACHIEVEMENT_BY_ID,
  ACHIEVEMENT_DEFINITIONS,
  DISPLAY_BADGE_PRIORITY,
} from "@/lib/achievements/definitions";
import type {
  AchievementHighlight,
  AchievementId,
  EarnedAchievement,
  TraderAchievementInput,
  UserAchievementSummary,
} from "@/lib/achievements/types";
import type { EnrichedLeaderboardEntry } from "@/lib/leaderboard-analytics";

function qualifies(id: AchievementId, input: TraderAchievementInput): boolean {
  const {
    rank,
    totalReturnPercent,
    periodChangePercent,
    holdingsCount,
    profileCreatedAt,
  } = input;

  switch (id) {
    case "top_trader":
      return rank <= 3;
    case "hot_streak":
      return periodChangePercent != null && periodChangePercent >= 2;
    case "momentum_hunter":
      return totalReturnPercent >= 10;
    case "diamond_hands":
      return holdingsCount >= 3 && totalReturnPercent > 0;
    case "early_adopter":
      if (!profileCreatedAt) return false;
      return Date.now() - new Date(profileCreatedAt).getTime() <= 30 * 24 * 60 * 60 * 1000;
    case "first_trade":
      return holdingsCount >= 1;
    case "portfolio_builder":
      return holdingsCount >= 2;
    default:
      return false;
  }
}

export function computeEarnedAchievements(
  input: TraderAchievementInput
): EarnedAchievement[] {
  return ACHIEVEMENT_DEFINITIONS.filter((def) => qualifies(def.id, input)).map(
    (def) => ({ ...def })
  );
}

export function computeUserAchievementSummary(
  input: TraderAchievementInput
): UserAchievementSummary {
  const earned = computeEarnedAchievements(input);
  return {
    earned,
    earnedCount: earned.length,
    achievementScore: earned.reduce((sum, a) => sum + a.points, 0),
  };
}

export function getDisplayBadges(input: TraderAchievementInput): AchievementId[] {
  const earnedIds = new Set(
    computeEarnedAchievements(input).map((a) => a.id)
  );
  return DISPLAY_BADGE_PRIORITY.filter((id) => earnedIds.has(id)).slice(0, 2);
}

export function buildAchievementHighlights(
  entries: EnrichedLeaderboardEntry[]
): AchievementHighlight[] {
  if (entries.length === 0) return [];

  const byGainToday = [...entries]
    .filter((e) => e.periodChangePercent != null && e.periodChangePercent > 0)
    .sort((a, b) => (b.periodChangePercent ?? 0) - (a.periodChangePercent ?? 0))[0];

  const newTraders = entries.filter((e) => {
    if (!e.profileCreatedAt) return false;
    const age = Date.now() - new Date(e.profileCreatedAt).getTime();
    return age <= 14 * 24 * 60 * 60 * 1000;
  });
  const bestNew = [...newTraders].sort(
    (a, b) => b.totalReturnPercent - a.totalReturnPercent
  )[0];

  const withHoldings = entries.filter((e) => e.holdingsCount > 0);
  const topReturn = [...withHoldings].sort(
    (a, b) => b.totalReturnPercent - a.totalReturnPercent
  )[0];

  const topRank = [...entries].sort((a, b) => a.rank - b.rank)[0];

  const highlights: AchievementHighlight[] = [];

  if (byGainToday) {
    highlights.push({
      id: "biggest-gain-today",
      emoji: "📈",
      label: "Biggest Gain Today",
      username: byGainToday.username,
      detail: `+${(byGainToday.periodChangePercent ?? 0).toFixed(1)}% today`,
      achievementId: "hot_streak",
    });
  }
  if (bestNew) {
    highlights.push({
      id: "best-new-trader",
      emoji: "🎯",
      label: "Best New Trader",
      username: bestNew.username,
      detail: `${bestNew.totalReturnPercent >= 0 ? "+" : ""}${bestNew.totalReturnPercent.toFixed(1)}% return`,
      achievementId: "early_adopter",
    });
  }
  if (topReturn) {
    highlights.push({
      id: "top-portfolio-return",
      emoji: "💎",
      label: "Top Portfolio Return",
      username: topReturn.username,
      detail: `${topReturn.totalReturnPercent >= 0 ? "+" : ""}${topReturn.totalReturnPercent.toFixed(1)}% all time`,
      achievementId: "momentum_hunter",
    });
  }
  if (topRank && topRank.rank === 1) {
    highlights.push({
      id: "current-champion",
      emoji: "👑",
      label: "Current Champion",
      username: topRank.username,
      detail: `${Math.round(topRank.total_value).toLocaleString()} DAQ portfolio`,
      achievementId: "top_trader",
    });
  }

  return highlights;
}

export function buildCompetitiveNudge(traderCount: number): string | null {
  if (traderCount === 0) return "Be the first trader on the board.";
  if (traderCount === 1) return "You're #1 — invite rivals and defend your crown.";
  if (traderCount < 5) return `${5 - traderCount} more traders until the board fills up.`;
  return null;
}

export { ACHIEVEMENT_BY_ID };
