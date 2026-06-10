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

export type MarketSort =
  | "price_desc"
  | "gainers"
  | "losers"
  | "most_traded"
  | "trending"
  | "name";

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  daq_balance: number;
  is_admin: boolean;
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
