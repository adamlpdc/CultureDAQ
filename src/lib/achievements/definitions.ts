import type { AchievementDefinition } from "@/lib/achievements/types";

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: "top_trader",
    emoji: "🏆",
    label: "Top Trader",
    description: "Rank in the top 3 on the leaderboard",
    points: 100,
  },
  {
    id: "hot_streak",
    emoji: "🔥",
    label: "Hot Streak",
    description: "Gain 2%+ in the current period",
    points: 75,
  },
  {
    id: "momentum_hunter",
    emoji: "🚀",
    label: "Momentum Hunter",
    description: "Achieve 10%+ total portfolio return",
    points: 60,
  },
  {
    id: "diamond_hands",
    emoji: "💎",
    label: "Diamond Hands",
    description: "Hold 3+ assets with positive return",
    points: 50,
  },
  {
    id: "early_adopter",
    emoji: "🎯",
    label: "Early Adopter",
    description: "Joined within the first 30 days",
    points: 40,
  },
  {
    id: "first_trade",
    emoji: "📊",
    label: "First Trade",
    description: "Open your first market position",
    points: 25,
  },
  {
    id: "portfolio_builder",
    emoji: "🧱",
    label: "Portfolio Builder",
    description: "Hold positions in 2+ assets",
    points: 30,
  },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(
  ACHIEVEMENT_DEFINITIONS.map((a) => [a.id, a])
) as Record<string, AchievementDefinition>;

export const DISPLAY_BADGE_PRIORITY = [
  "top_trader",
  "hot_streak",
  "momentum_hunter",
  "diamond_hands",
  "early_adopter",
  "portfolio_builder",
  "first_trade",
] as const;
