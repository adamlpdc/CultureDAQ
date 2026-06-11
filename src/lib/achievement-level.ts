export interface AchievementLevel {
  level: number;
  minScore: number;
  maxScore: number;
}

export const ACHIEVEMENT_LEVELS: AchievementLevel[] = [
  { level: 1, minScore: 0, maxScore: 250 },
  { level: 2, minScore: 251, maxScore: 750 },
  { level: 3, minScore: 751, maxScore: 1500 },
  { level: 4, minScore: 1501, maxScore: 2500 },
  { level: 5, minScore: 2501, maxScore: 5000 },
  { level: 6, minScore: 5001, maxScore: 10000 },
];

export interface AchievementLevelInfo {
  level: number;
  label: string;
  score: number;
  minScore: number;
  maxScore: number;
  nextLevelAt: number | null;
  progressInLevel: number;
}

export function getAchievementLevel(score: number): AchievementLevelInfo {
  const clamped = Math.max(0, score);
  let tier =
    ACHIEVEMENT_LEVELS.find(
      (t) => clamped >= t.minScore && clamped <= t.maxScore
    ) ?? ACHIEVEMENT_LEVELS[ACHIEVEMENT_LEVELS.length - 1];

  if (clamped > ACHIEVEMENT_LEVELS[ACHIEVEMENT_LEVELS.length - 1].maxScore) {
    tier = ACHIEVEMENT_LEVELS[ACHIEVEMENT_LEVELS.length - 1];
  }

  const nextTier = ACHIEVEMENT_LEVELS.find((t) => t.level === tier.level + 1);
  const span = tier.maxScore - tier.minScore + 1;
  const progressInLevel = Math.min(
    100,
    Math.round(((clamped - tier.minScore) / span) * 100)
  );

  return {
    level: tier.level,
    label: `Level ${tier.level}`,
    score: clamped,
    minScore: tier.minScore,
    maxScore: tier.maxScore,
    nextLevelAt: nextTier?.minScore ?? null,
    progressInLevel,
  };
}

export function getAchievementLevelTitle(level: number): string {
  return `Level ${level} Trader`;
}
