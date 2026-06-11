export type AssetCategory =
  | "actors"
  | "musicians"
  | "athletes"
  | "influencers"
  | "tv_personalities"
  | "brands"
  | "movies"
  | "tv_shows"
  | "sports_teams";

export type TradeType = "buy" | "sell";

export type PriceEventSource =
  | "market_engine"
  | "buy_pressure"
  | "sell_pressure"
  | "momentum"
  | "volatility"
  | "category_trend"
  | "random"
  | "admin"
  | "news"
  | "social"
  | "search_trends"
  | "sports_results"
  | "box_office"
  | "tv_ratings"
  | "ai_generated";

export type MarketEventType =
  | "category_trending"
  | "rank_up"
  | "rank_down"
  | "buying_pressure"
  | "selling_pressure"
  | "new_listing"
  | "market_momentum"
  | "cultural_moment";

export interface MarketEvent {
  id: string;
  asset_id: string;
  event_type: MarketEventType;
  headline: string;
  description: string;
  impact_score: number;
  is_positive: boolean;
  created_at: string;
  expires_at: string | null;
}

export type MarketSort =
  | "price_desc"
  | "price_asc"
  | "gainers"
  | "losers"
  | "most_traded"
  | "trending"
  | "new_listings"
  | "name";

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  daq_balance: number;
  is_admin: boolean;
  avatar_style: string;
  favorite_achievement_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  slug: string;
  name: string;
  category: AssetCategory;
  description: string | null;
  image_url: string | null;
  current_price: number;
  previous_price: number;
  buy_pressure: number;
  sell_pressure: number;
  momentum_score: number;
  volatility_score: number;
  category_weight: number;
  featured: boolean;
  trading_paused: boolean;
  trade_volume_24h: number;
  total_shares_outstanding: number;
  created_at: string;
  updated_at: string;
}

export interface AssetPrice {
  id: string;
  asset_id: string;
  price: number;
  recorded_at: string;
}

export interface AssetRankHistory {
  id: string;
  asset_id: string;
  rank: number;
  previous_rank: number | null;
  rank_change: number | null;
  portfolio_value_basis: number;
  price: number;
  recorded_at: string;
}

/** Current rank for an asset at a point in time */
export interface AssetRank {
  assetId: string;
  rank: number;
  price: number;
  portfolioValueBasis: number;
}

/** Rank movement between the latest two snapshots */
export interface AssetRankMovement {
  assetId: string;
  rank: number;
  previousRank: number | null;
  rankChange: number | null;
  price: number;
  recordedAt: string | null;
  isNewlyRanked: boolean;
}

/** A stored rank snapshot row (application shape) */
export interface RankSnapshot {
  assetId: string;
  rank: number;
  previousRank: number | null;
  rankChange: number | null;
  portfolioValueBasis: number;
  price: number;
  recordedAt: string;
}

export interface Holding {
  id: string;
  user_id: string;
  asset_id: string;
  shares: number;
  avg_cost: number;
  created_at: string;
  updated_at: string;
}

export interface HoldingWithAsset extends Holding {
  asset: Asset;
}

export interface Trade {
  id: string;
  user_id: string;
  asset_id: string;
  trade_type: TradeType;
  shares: number;
  price_per_share: number;
  total_daq: number;
  asset_market_rank: number | null;
  asset_was_down: boolean;
  created_at: string;
}

export interface TradeWithAsset extends Trade {
  asset: Asset;
}

export interface PriceEvent {
  id: string;
  asset_id: string;
  old_price: number;
  new_price: number;
  change_percent: number;
  reason: string;
  source: PriceEventSource;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  total_value: number;
  daq_balance: number;
  holdings_value: number;
  recorded_at: string;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  username: string;
  total_value: number;
  rank: number;
  recorded_at: string;
}

export interface PortfolioSummary {
  daq_balance: number;
  holdings_value: number;
  total_value: number;
  holdings_count: number;
  day_change_percent: number | null;
}

export interface SeedAsset {
  slug: string;
  name: string;
  category: AssetCategory;
  description?: string;
  image_url?: string;
  current_price?: number;
  volatility_score?: number;
  category_weight?: number;
  featured?: boolean;
}

export type AchievementCategory =
  | "Getting Started"
  | "Trading"
  | "Portfolio"
  | "Discovery"
  | "Rankings"
  | "Categories"
  | "Streaks"
  | "Special";

export type AchievementRarity = "Common" | "Rare" | "Epic" | "Legendary";

/** standard = always available; seasonal/event/league reserved for future use */
export type AchievementScope = "standard" | "seasonal" | "event" | "league";

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  points: number;
  icon: string;
  requirement_type: string;
  requirement_value: Record<string, unknown>;
  is_hidden: boolean;
  rarity: AchievementRarity;
  scope: AchievementScope;
  season_id: string | null;
  event_id: string | null;
  league_id: string | null;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string | null;
  progress: number;
  is_unlocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserAchievementWithDetails extends UserAchievement {
  achievement: Achievement;
}

export interface UnlockedAchievement {
  code: string;
  name: string;
  icon: string;
  points: number;
  rarity: AchievementRarity;
  unlockedAt: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  asset_id: string;
  notes: string | null;
  created_at: string;
}

export type NotificationType =
  | "achievement_unlocked"
  | "watchlist_alert"
  | "rank_event"
  | "market_event"
  | "portfolio_event"
  | "leaderboard_event"
  | "system";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  asset_id: string | null;
  achievement_id: string | null;
  is_read: boolean;
  dedupe_key: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  achievements_enabled: boolean;
  watchlist_enabled: boolean;
  leaderboard_enabled: boolean;
  portfolio_enabled: boolean;
  rank_events_enabled: boolean;
  market_events_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  assetId?: string | null;
  achievementId?: string | null;
  dedupeKey?: string | null;
}
