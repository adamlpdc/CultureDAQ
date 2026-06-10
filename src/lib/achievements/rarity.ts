import type { AchievementRarity } from "@/types/database";

export const RARITY_BY_CODE: Record<string, AchievementRarity> = {
  FIRST_TRADE: "Common",
  FIRST_BUY: "Common",
  FIRST_PROFIT: "Common",
  ACTIVE_TRADER: "Rare",
  MARKET_REGULAR: "Epic",
  POWER_TRADER: "Epic",
  PORTFOLIO_BUILDER: "Rare",
  DIVERSIFIED: "Rare",
  CULTURE_FUND: "Epic",
  BIG_PORTFOLIO: "Epic",
  MARKET_MOGUL: "Legendary",
  CULTURE_TITAN: "Legendary",
  TREND_SPOTTER: "Rare",
  TALENT_SCOUT: "Epic",
  CULTURAL_ORACLE: "Epic",
  KINGMAKER: "Legendary",
  TOP_100_TRADER: "Rare",
  TOP_25_TRADER: "Epic",
  TOP_10_TRADER: "Epic",
  NUMBER_ONE: "Legendary",
  MOVIE_BUFF: "Rare",
  MUSIC_MOGUL: "Rare",
  SPORTS_FANATIC: "Rare",
  BRAND_BUILDER: "Rare",
  STAR_COLLECTOR: "Rare",
  HOT_STREAK: "Rare",
  GREEN_PORTFOLIO: "Epic",
  EARLY_ADOPTER: "Rare",
  DIAMOND_HANDS: "Epic",
  CONTRARIAN: "Epic",
  PERFECT_TIMING: "Legendary",
};

export function getAchievementRarity(code: string): AchievementRarity {
  return RARITY_BY_CODE[code] ?? "Common";
}
