export type AchievementId =
  | "top_trader"
  | "hot_streak"
  | "momentum_hunter"
  | "early_adopter"
  | "diamond_hands"
  | "first_trade"
  | "portfolio_builder";

export interface AchievementDefinition {
  id: AchievementId;
  emoji: string;
  label: string;
  description: string;
  points: number;
}

export interface EarnedAchievement extends AchievementDefinition {
  earnedAt?: string;
}

export interface UserAchievementSummary {
  earned: EarnedAchievement[];
  earnedCount: number;
  achievementScore: number;
}

export interface TraderAchievementInput {
  rank: number;
  totalReturnPercent: number;
  periodChangePercent: number | null;
  holdingsCount: number;
  profileCreatedAt?: string;
}

export interface AchievementHighlight {
  id: string;
  label: string;
  emoji: string;
  username: string;
  detail: string;
  achievementId?: AchievementId;
}
