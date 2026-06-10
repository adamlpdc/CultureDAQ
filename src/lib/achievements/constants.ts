/** Users who joined on or before this date qualify for Early Adopter */
export const EARLY_ADOPTER_CUTOFF = new Date("2026-12-31T23:59:59Z");

export const ACHIEVEMENT_FILTER_TABS = [
  "All",
  "Unlocked",
  "Locked",
  "Getting Started",
  "Trading",
  "Portfolio",
  "Discovery",
  "Rankings",
  "Categories",
  "Streaks",
  "Special",
] as const;

export type AchievementFilterTab = (typeof ACHIEVEMENT_FILTER_TABS)[number];
