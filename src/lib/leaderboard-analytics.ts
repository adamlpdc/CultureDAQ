import { STARTING_DAQ } from "@/lib/constants";
import type { AchievementId } from "@/lib/achievements";
import { getDisplayBadges } from "@/lib/achievements";
import type { LeaderboardEntry } from "@/types/database";

export type LeaderboardPeriod = "today" | "week" | "month" | "all";

export type LeaderboardBadge = AchievementId;

export interface EnrichedLeaderboardEntry extends LeaderboardEntry {
  totalReturnPercent: number;
  periodChangePercent: number | null;
  rankChange: number | null;
  badges: LeaderboardBadge[];
  holdingsCount: number;
  profileCreatedAt?: string;
}

export interface LeaderboardStats {
  totalTraders: number;
  highestPortfolio: number;
  largestGainToday: number;
}

export interface UserLeaderboardPosition {
  rank: number;
  totalValue: number;
  totalReturnPercent: number;
  changeTodayPercent: number | null;
  username: string;
  rankChange: number | null;
  badges: LeaderboardBadge[];
  achievementsEarned: number;
  achievementScore: number;
}

export interface HallOfFameEntry {
  label: string;
  emoji: string;
  username: string;
  value: string;
  note?: string;
}

const PERIOD_MS: Record<Exclude<LeaderboardPeriod, "all">, number> = {
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

export function getPeriodMs(period: LeaderboardPeriod): number | null {
  if (period === "all") return null;
  return PERIOD_MS[period];
}

export function computeTotalReturn(totalValue: number): number {
  return STARTING_DAQ > 0 ? ((totalValue - STARTING_DAQ) / STARTING_DAQ) * 100 : 0;
}

export function computePeriodChange(
  latest: number,
  baseline: number | null | undefined
): number | null {
  if (baseline == null || baseline <= 0) return null;
  return ((latest - baseline) / baseline) * 100;
}

export function computeRankChange(
  currentRank: number,
  previousRank: number | null | undefined
): number | null {
  if (previousRank == null) return null;
  return previousRank - currentRank;
}

export function assignLeaderboardBadges(input: {
  rank: number;
  totalReturnPercent: number;
  periodChangePercent: number | null;
  holdingsCount: number;
  profileCreatedAt?: string;
}): LeaderboardBadge[] {
  return getDisplayBadges(input);
}

export function sortEntriesByPeriod(
  entries: EnrichedLeaderboardEntry[],
  period: LeaderboardPeriod
): EnrichedLeaderboardEntry[] {
  const sorted = [...entries];
  if (period === "all") {
    sorted.sort((a, b) => b.total_value - a.total_value);
  } else {
    sorted.sort((a, b) => {
      const aChange = a.periodChangePercent ?? -Infinity;
      const bChange = b.periodChangePercent ?? -Infinity;
      if (bChange !== aChange) return bChange - aChange;
      return b.total_value - a.total_value;
    });
  }
  return sorted.map((e, i) => ({ ...e, rank: i + 1 }));
}

export function buildHallOfFame(
  entries: EnrichedLeaderboardEntry[],
  weekChanges: Map<string, number>
): HallOfFameEntry[] {
  if (entries.length === 0) return [];

  const topValue = [...entries].sort((a, b) => b.total_value - a.total_value)[0];
  const weekGains = entries
    .map((e) => ({ e, gain: weekChanges.get(e.user_id) }))
    .filter((x) => x.gain != null && x.gain > 0)
    .sort((a, b) => (b.gain ?? 0) - (a.gain ?? 0));
  const bestWeek = weekGains[0];

  const items: HallOfFameEntry[] = [];

  if (topValue) {
    items.push({
      emoji: "👑",
      label: "Highest Portfolio",
      username: topValue.username,
      value: `${Math.round(topValue.total_value).toLocaleString()} DAQ`,
    });
  }
  if (bestWeek) {
    items.push({
      emoji: "🚀",
      label: "Biggest Weekly Gain",
      username: bestWeek.e.username,
      value: `+${(bestWeek.gain ?? 0).toFixed(1)}%`,
    });
  }
  items.push({
    emoji: "🏟️",
    label: "Longest Time in Top 10",
    username: "—",
    value: "Season tracking",
    note: "Coming with league seasons",
  });

  return items;
}

export function buildLeaderboardStats(
  entries: EnrichedLeaderboardEntry[]
): LeaderboardStats {
  const totalTraders = entries.length;
  const highestPortfolio = entries.reduce((max, e) => Math.max(max, e.total_value), 0);
  const largestGainToday = entries.reduce(
    (max, e) => Math.max(max, e.periodChangePercent ?? 0),
    0
  );
  return { totalTraders, highestPortfolio, largestGainToday };
}

export interface TraderProfileMeta {
  user_id: string;
  created_at: string;
  holdingsCount: number;
}

export function enrichLeaderboardEntry(
  entry: LeaderboardEntry,
  meta: {
    periodChangePercent: number | null;
    previousRank: number | null;
    profileCreatedAt?: string;
    holdingsCount: number;
  }
): EnrichedLeaderboardEntry {
  const totalReturnPercent = computeTotalReturn(entry.total_value);
  const rankChange = computeRankChange(entry.rank, meta.previousRank);
  const badges = assignLeaderboardBadges({
    rank: entry.rank,
    totalReturnPercent,
    periodChangePercent: meta.periodChangePercent,
    holdingsCount: meta.holdingsCount,
    profileCreatedAt: meta.profileCreatedAt,
  });

  return {
    ...entry,
    totalReturnPercent,
    periodChangePercent: meta.periodChangePercent,
    rankChange,
    badges,
    holdingsCount: meta.holdingsCount,
    profileCreatedAt: meta.profileCreatedAt,
  };
}
