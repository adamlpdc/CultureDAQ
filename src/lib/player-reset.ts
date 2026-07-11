export const MARKET_DEPENDENT_ACHIEVEMENT_REQUIREMENTS = new Set([
  "trade_count",
  "buy_count",
  "profitable_holding",
  "profitable_holdings",
  "all_holdings_profitable",
  "unique_assets",
  "unique_categories",
  "portfolio_value",
  "discovery_rank",
  "leaderboard_rank",
  "category_holdings",
  "hold_days",
  "contrarian",
  "perfect_timing",
]);

export function shouldResetAchievement(requirementType: string): boolean {
  return MARKET_DEPENDENT_ACHIEVEMENT_REQUIREMENTS.has(requirementType);
}
