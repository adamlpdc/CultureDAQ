import type { PriceEventSource } from "@/types/database";

export const PRICE_EVENT_SOURCE_LABELS: Record<PriceEventSource, string> = {
  market_engine: "Market Engine",
  buy_pressure: "Buy Pressure",
  sell_pressure: "Sell Pressure",
  momentum: "Momentum",
  volatility: "Volatility",
  category_trend: "Category Trend",
  random: "Market Activity",
  admin: "Admin Update",
  news: "News",
  social: "Social Buzz",
  search_trends: "Search Trends",
  sports_results: "Sports Results",
  box_office: "Box Office",
  tv_ratings: "TV Ratings",
  ai_generated: "AI Insight",
};

export function getVolatilityLabel(score: number): string {
  if (score < 1) return "Low";
  if (score <= 1.5) return "Moderate";
  return "High";
}

export function getMomentumLabel(score: number): string {
  if (score < 0.5) return "Cooling";
  if (score <= 1.5) return "Steady";
  return "Building";
}
