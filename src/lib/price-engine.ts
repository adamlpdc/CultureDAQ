import type { Asset, AssetCategory, PriceEventSource } from "@/types/database";
import { MAX_PRICE_CHANGE_PERCENT, MIN_ASSET_PRICE } from "@/lib/constants";

export interface PriceUpdateResult {
  assetId: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  reason: string;
  source: PriceEventSource;
  metadata: Record<string, unknown>;
}

const CATEGORY_BASE_TREND: Record<AssetCategory, number> = {
  actors: 0.001,
  musicians: 0.002,
  athletes: 0.0015,
  influencers: 0.003,
  tv_personalities: 0.001,
  brands: 0.0005,
  movies: 0.0025,
  tv_shows: 0.002,
  sports_teams: 0.0015,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

function generateReason(
  factors: { label: string; impact: number; source: PriceEventSource }[]
): { reason: string; source: PriceEventSource; metadata: Record<string, unknown> } {
  const significant = factors
    .filter((f) => Math.abs(f.impact) > 0.001)
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  if (significant.length === 0) {
    return {
      reason: "Quiet market session with minimal trading activity.",
      source: "random",
      metadata: { factors: [] },
    };
  }

  const primary = significant[0];
  const secondary = significant[1];

  let reason = primary.label;
  if (secondary && Math.abs(secondary.impact) > Math.abs(primary.impact) * 0.5) {
    reason += ` ${secondary.label.charAt(0).toLowerCase()}${secondary.label.slice(1)}`;
  }

  return {
    reason,
    source: primary.source,
    metadata: {
      factors: significant.map((f) => ({
        label: f.label,
        impact: f.impact,
        source: f.source,
      })),
    },
  };
}

export function calculateNewPrice(
  asset: Asset,
  timestamp: Date = new Date()
): PriceUpdateResult {
  const oldPrice = Number(asset.current_price);
  const timeSeed = `${asset.slug}-${timestamp.toISOString().slice(0, 16)}`;

  const buyPressure = Number(asset.buy_pressure);
  const sellPressure = Number(asset.sell_pressure);
  const momentum = Number(asset.momentum_score);
  const volatility = Number(asset.volatility_score);
  const categoryWeight = Number(asset.category_weight);
  const volume = Number(asset.trade_volume_24h);

  const pressureDelta = buyPressure - sellPressure;
  const pressureImpact =
    clamp(pressureDelta / Math.max(volume + 100, 100), -0.05, 0.05) * volatility;

  const momentumImpact = clamp(momentum * 0.01, -0.03, 0.03);

  const categoryTrend =
    CATEGORY_BASE_TREND[asset.category] * categoryWeight * (seededRandom(timeSeed) > 0.5 ? 1 : -1);

  const randomWalk = (seededRandom(timeSeed + "r") - 0.5) * 0.02 * volatility;

  const volumeBoost =
    volume > 50 ? clamp((volume / 1000) * 0.01, 0, 0.02) : 0;

  const factors: { label: string; impact: number; source: PriceEventSource }[] = [];

  if (Math.abs(pressureImpact) > 0.001) {
    factors.push({
      label:
        pressureImpact > 0
          ? "Strong buying pressure pushed the price higher."
          : "Selling pressure weighed on the price.",
      impact: pressureImpact,
      source: pressureImpact > 0 ? "buy_pressure" : "sell_pressure",
    });
  }

  if (Math.abs(momentumImpact) > 0.001) {
    factors.push({
      label:
        momentumImpact > 0
          ? "Positive momentum carried the asset upward."
          : "Negative momentum dragged the price down.",
      impact: momentumImpact,
      source: "momentum",
    });
  }

  if (Math.abs(categoryTrend) > 0.0005) {
    factors.push({
      label:
        categoryTrend > 0
          ? `The ${asset.category.replace(/_/g, " ")} category is trending up.`
          : `The ${asset.category.replace(/_/g, " ")} category cooled off.`,
      impact: categoryTrend,
      source: "category_trend",
    });
  }

  if (Math.abs(randomWalk) > 0.003) {
    factors.push({
      label:
        randomWalk > 0
          ? "Speculative trading added upside volatility."
          : "Market uncertainty triggered a pullback.",
      impact: randomWalk,
      source: "random",
    });
  }

  if (volumeBoost > 0.001) {
    factors.push({
      label: "High trading volume attracted more market attention.",
      impact: volumeBoost,
      source: "market_engine",
    });
  }

  let totalChange =
    pressureImpact + momentumImpact + categoryTrend + randomWalk + volumeBoost;
  totalChange = clamp(totalChange, -MAX_PRICE_CHANGE_PERCENT / 100, MAX_PRICE_CHANGE_PERCENT / 100);

  let newPrice = oldPrice * (1 + totalChange);
  newPrice = Math.max(MIN_ASSET_PRICE, Math.round(newPrice * 10000) / 10000);

  const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;

  const { reason, source, metadata } = generateReason(factors);

  return {
    assetId: asset.id,
    oldPrice,
    newPrice,
    changePercent: Math.round(changePercent * 100) / 100,
    reason,
    source,
    metadata,
  };
}

export function calculateMomentumUpdate(
  asset: Asset,
  changePercent: number
): number {
  const current = Number(asset.momentum_score);
  const decay = current * 0.7;
  const impulse = changePercent * 0.1;
  return clamp(decay + impulse, -10, 10);
}

export function decayPressure(value: number): number {
  return Math.max(0, value * 0.5);
}
