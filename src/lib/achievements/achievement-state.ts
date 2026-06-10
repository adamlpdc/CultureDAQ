import type { Achievement, UserAchievement } from "@/types/database";
import type { AchievementCheckContext } from "@/lib/achievements/unlock";
import { evaluateAchievement } from "@/lib/achievements/unlock";
import {
  getAchievementProgressDetail,
  type AchievementProgressDetail,
} from "@/lib/achievements/progress-detail";
import type { AchievementCardData, UserAchievementStats } from "@/lib/queries";
import { getHowToUnlock } from "@/lib/achievements/seed-data";

export interface ResolvedAchievementState {
  isUnlocked: boolean;
  progress: number;
  unlockedAt: string | null;
  progressDetail: AchievementProgressDetail;
}

export function resolveAchievementState(
  achievement: Achievement,
  ctx: AchievementCheckContext | null,
  userRow?: UserAchievement | null
): ResolvedAchievementState {
  const evaluation = ctx
    ? evaluateAchievement(achievement, ctx)
    : { progress: 0, qualified: false };

  const persistedUnlocked = Boolean(userRow?.is_unlocked);
  const isUnlocked = persistedUnlocked || evaluation.qualified;

  const progress = isUnlocked
    ? 100
    : Math.max(Number(userRow?.progress ?? 0), evaluation.progress);

  let progressDetail = getAchievementProgressDetail(achievement, ctx);

  if (isUnlocked) {
    progressDetail = {
      progress: 100,
      summary: "Completed",
      metricLabel: "Status",
      currentDisplay: "Unlocked",
      targetDisplay: "✓",
    };
  }

  return {
    isUnlocked,
    progress,
    unlockedAt: userRow?.unlocked_at ?? null,
    progressDetail,
  };
}

export function buildAchievementCard(
  achievement: Achievement,
  state: ResolvedAchievementState
): AchievementCardData {
  return {
    achievement,
    progress: state.progress,
    isUnlocked: state.isUnlocked,
    unlockedAt: state.unlockedAt,
    description: achievement.description,
    howToUnlock: getHowToUnlock(achievement.code, achievement.description),
    progressDetail: state.progressDetail,
  };
}

export function buildStatsFromCards(
  cards: AchievementCardData[],
  totalAchievements: number
): UserAchievementStats {
  const unlocked = cards.filter((c) => c.isUnlocked);
  const earnedCount = unlocked.length;
  const achievementScore = unlocked.reduce((sum, c) => sum + c.achievement.points, 0);
  const completionPercent =
    totalAchievements > 0 ? Math.round((earnedCount / totalAchievements) * 100) : 0;

  const withDates = unlocked
    .filter((c) => c.unlockedAt)
    .sort(
      (a, b) =>
        new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime()
    );

  const latestCard = withDates[0] ?? null;

  return {
    earnedCount,
    achievementScore,
    totalAchievements,
    completionPercent,
    latestAchievement: latestCard?.achievement ?? null,
    latestUnlockedAt: latestCard?.unlockedAt ?? null,
  };
}

export function indexUserAchievements(
  rows: Array<UserAchievement & { achievement?: { id?: string; code?: string } | null }>
): {
  byId: Map<string, UserAchievement>;
  byCode: Map<string, UserAchievement>;
} {
  const byId = new Map<string, UserAchievement>();
  const byCode = new Map<string, UserAchievement>();

  for (const row of rows) {
    byId.set(row.achievement_id, row as UserAchievement);
    const code = row.achievement?.code;
    if (code) byCode.set(code, row as UserAchievement);
    const linkedId = row.achievement?.id;
    if (linkedId) byId.set(linkedId, row as UserAchievement);
  }

  return { byId, byCode };
}

export function findUserAchievementRow(
  achievement: Achievement,
  maps: { byId: Map<string, UserAchievement>; byCode: Map<string, UserAchievement> }
): UserAchievement | undefined {
  return (
    maps.byId.get(achievement.id) ??
    maps.byCode.get(achievement.code) ??
    undefined
  );
}
