import type { Asset } from "@/types/database";
import { getPriceChange } from "@/lib/utils";

const NEW_LISTING_DAYS = 14;
const RISING_FAST_MIN = 2;
const FALLING_FAST_MAX = -2;

export interface MarketBadgeContext {
  trendingIds: Set<string>;
  newIds: Set<string>;
  highMomentumIds: Set<string>;
  mostTradedIds: Set<string>;
  risingFastIds: Set<string>;
  fallingFastIds: Set<string>;
}

export type MarketStatus =
  | "trending"
  | "high_momentum"
  | "new_listing"
  | "most_traded"
  | "featured"
  | "rising_fast"
  | "falling_fast";

const STATUS_PRIORITY: MarketStatus[] = [
  "new_listing",
  "featured",
  "trending",
  "most_traded",
  "rising_fast",
  "falling_fast",
  "high_momentum",
];

export function buildMarketBadgeContext(
  trending: Asset[] = [],
  gainers: Asset[] = [],
  losers: Asset[] = [],
  newListings: Asset[] = [],
  mostTraded: Asset[] = [],
  allForMomentum: Asset[] = []
): MarketBadgeContext {
  const trendingIds = new Set(trending.map((a) => a.id));
  const newIds = new Set(newListings.map((a) => a.id));
  const mostTradedIds = new Set(mostTraded.map((a) => a.id));

  const cutoff = Date.now() - NEW_LISTING_DAYS * 24 * 60 * 60 * 1000;
  for (const asset of allForMomentum) {
    if (new Date(asset.created_at).getTime() >= cutoff) {
      newIds.add(asset.id);
    }
  }

  const risingFastIds = new Set(
    gainers
      .filter((a) => getPriceChange(a.current_price, a.previous_price) >= RISING_FAST_MIN)
      .slice(0, 10)
      .map((a) => a.id)
  );

  const fallingFastIds = new Set(
    losers
      .filter((a) => getPriceChange(a.current_price, a.previous_price) <= FALLING_FAST_MAX)
      .slice(0, 10)
      .map((a) => a.id)
  );

  const scored = allForMomentum
    .map((a) => ({
      id: a.id,
      score:
        Math.abs(getPriceChange(a.current_price, a.previous_price)) * a.trade_volume_24h,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const highMomentumIds = new Set(scored.map((s) => s.id));

  return {
    trendingIds,
    newIds,
    highMomentumIds,
    mostTradedIds,
    risingFastIds,
    fallingFastIds,
  };
}

export function getMarketStatuses(
  asset: Asset,
  ctx: MarketBadgeContext,
  max = 2
): MarketStatus[] {
  const applicable: MarketStatus[] = [];

  if (ctx.newIds.has(asset.id)) applicable.push("new_listing");
  if (asset.featured) applicable.push("featured");
  if (ctx.trendingIds.has(asset.id)) applicable.push("trending");
  if (ctx.mostTradedIds.has(asset.id)) applicable.push("most_traded");
  if (ctx.risingFastIds.has(asset.id)) applicable.push("rising_fast");
  if (ctx.fallingFastIds.has(asset.id)) applicable.push("falling_fast");
  if (ctx.highMomentumIds.has(asset.id)) applicable.push("high_momentum");

  const ordered = STATUS_PRIORITY.filter((s) => applicable.includes(s));
  return ordered.slice(0, max);
}

/** @deprecated Use MarketStatus */
export type MarketAssetBadge = "trending" | "new" | "momentum";

export function getMarketAssetBadges(
  asset: Asset,
  ctx: MarketBadgeContext
): MarketAssetBadge[] {
  return getMarketStatuses(asset, ctx).map((s) => {
    if (s === "new_listing") return "new";
    if (s === "high_momentum") return "momentum";
    return "trending";
  });
}
