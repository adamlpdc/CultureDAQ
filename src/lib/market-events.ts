import type { SupabaseClient } from "@supabase/supabase-js";
import { CULTURE_MOMENTS, CATEGORY_LABELS } from "@/lib/constants";
import { getAssetRankMovementsMap } from "@/lib/asset-ranking";
import type {
  Asset,
  AssetCategory,
  AssetRankMovement,
  MarketEvent,
  MarketEventType,
} from "@/types/database";
import { CATEGORY_MARKET_LABELS } from "@/lib/market-commentary";
import { getPriceChange } from "@/lib/utils";
import { detectSignificantRankEvent } from "@/lib/rank-significance";
import {
  fetchNewsSignals,
  fetchSearchTrendSignals,
  fetchSocialSignals,
  fetchSportsSignals,
} from "@/lib/market-events/integrations";

const NEW_LISTING_DAYS = 14;
const PRESSURE_RATIO_THRESHOLD = 1.15;
const MIN_PRESSURE = 0.25;
const CATEGORY_TREND_THRESHOLD = 0.25;
const MOMENTUM_BUILDING = 1.5;
const MOMENTUM_COOLING = 0.5;

const EVENT_TTL_HOURS: Record<MarketEventType, number> = {
  category_trending: 12,
  rank_up: 24,
  rank_down: 24,
  buying_pressure: 6,
  selling_pressure: 6,
  new_listing: 336,
  market_momentum: 12,
  cultural_moment: 168,
};

export interface MarketEventDraft {
  asset_id: string;
  event_type: MarketEventType;
  headline: string;
  description: string;
  impact_score: number;
  is_positive: boolean;
  expires_at: string;
}

export interface GenerateAssetEventsResult {
  generated: number;
  skipped: number;
}

function hoursFromNow(hours: number, from = new Date()): string {
  return new Date(from.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function clampImpact(value: number, max = 5): number {
  return Math.min(max, Math.max(1, Math.round(value)));
}

function calculateCategoryMomentum(
  assets: Asset[]
): Map<AssetCategory, number> {
  const buckets = new Map<AssetCategory, number[]>();

  for (const asset of assets) {
    const change = getPriceChange(asset.current_price, asset.previous_price);
    const list = buckets.get(asset.category) ?? [];
    list.push(change);
    buckets.set(asset.category, list);
  }

  const averages = new Map<AssetCategory, number>();
  for (const [category, changes] of buckets) {
    const avg = changes.reduce((sum, c) => sum + c, 0) / changes.length;
    averages.set(category, avg);
  }
  return averages;
}

function buildCultureMomentBySlug(): Map<string, (typeof CULTURE_MOMENTS)[number]> {
  const map = new Map<string, (typeof CULTURE_MOMENTS)[number]>();
  for (const moment of CULTURE_MOMENTS) {
    for (const slug of moment.assetSlugs) {
      map.set(slug, moment);
    }
  }
  return map;
}

function draftRankEvent(
  asset: Asset,
  movement: AssetRankMovement,
  createdAt: string
): MarketEventDraft | null {
  const { rank, previousRank, rankChange } = movement;
  if (previousRank == null || rankChange == null || rankChange === 0) {
    return null;
  }

  const significant = detectSignificantRankEvent(previousRank, rank);
  if (!significant) return null;

  return {
    asset_id: asset.id,
    event_type: significant.isPositive ? "rank_up" : "rank_down",
    headline: significant.headline,
    description: `${asset.name}: ${significant.bullet}`,
    impact_score: significant.impactScore,
    is_positive: significant.isPositive,
    expires_at: hoursFromNow(
      significant.isPositive ? EVENT_TTL_HOURS.rank_up : EVENT_TTL_HOURS.rank_down,
      new Date(createdAt)
    ),
  };
}

function draftCategoryTrendEvent(
  asset: Asset,
  categoryAvg: number,
  createdAt: string
): MarketEventDraft | null {
  const assetChange = getPriceChange(asset.current_price, asset.previous_price);
  const trendingUp = categoryAvg >= CATEGORY_TREND_THRESHOLD;
  const trendingDown = categoryAvg <= -CATEGORY_TREND_THRESHOLD;

  if (!trendingUp && !trendingDown) return null;
  if (trendingUp && assetChange < 0) return null;
  if (trendingDown && assetChange > 0) return null;

  const label = CATEGORY_LABELS[asset.category];
  const isPositive = trendingUp;

  return {
    asset_id: asset.id,
    event_type: "category_trending",
    headline: `${label} Category Trending`,
    description: isPositive
      ? `${label} assets are gaining attention across the market.`
      : `${label} assets are facing broader category pressure.`,
    impact_score: clampImpact(Math.abs(categoryAvg) + 2),
    is_positive: isPositive,
    expires_at: hoursFromNow(EVENT_TTL_HOURS.category_trending, new Date(createdAt)),
  };
}

function draftPressureEvent(
  asset: Asset,
  createdAt: string
): MarketEventDraft | null {
  const buy = Number(asset.buy_pressure);
  const sell = Number(asset.sell_pressure);

  if (buy >= MIN_PRESSURE && buy > sell * PRESSURE_RATIO_THRESHOLD) {
    return {
      asset_id: asset.id,
      event_type: "buying_pressure",
      headline: "Increased Buying Pressure",
      description: `Traders are accumulating ${asset.name} faster than sellers are exiting.`,
      impact_score: clampImpact(buy - sell + 2),
      is_positive: true,
      expires_at: hoursFromNow(EVENT_TTL_HOURS.buying_pressure, new Date(createdAt)),
    };
  }

  if (sell >= MIN_PRESSURE && sell > buy * PRESSURE_RATIO_THRESHOLD) {
    return {
      asset_id: asset.id,
      event_type: "selling_pressure",
      headline: "Increased Selling Pressure",
      description: `Profit-taking and exits are weighing on ${asset.name}.`,
      impact_score: clampImpact(sell - buy + 2),
      is_positive: false,
      expires_at: hoursFromNow(EVENT_TTL_HOURS.selling_pressure, new Date(createdAt)),
    };
  }

  return null;
}

function draftMomentumEvent(
  asset: Asset,
  createdAt: string
): MarketEventDraft | null {
  const momentum = Number(asset.momentum_score);

  if (momentum >= MOMENTUM_BUILDING) {
    return {
      asset_id: asset.id,
      event_type: "market_momentum",
      headline: "Market Momentum Building",
      description: `${asset.name} is riding a sustained positive momentum wave.`,
      impact_score: clampImpact(momentum + 1),
      is_positive: true,
      expires_at: hoursFromNow(EVENT_TTL_HOURS.market_momentum, new Date(createdAt)),
    };
  }

  if (momentum <= MOMENTUM_COOLING && momentum > 0) {
    return {
      asset_id: asset.id,
      event_type: "market_momentum",
      headline: "Market Momentum Cooling",
      description: `Momentum is fading for ${asset.name} after recent activity.`,
      impact_score: clampImpact(3 - momentum + 1),
      is_positive: false,
      expires_at: hoursFromNow(EVENT_TTL_HOURS.market_momentum, new Date(createdAt)),
    };
  }

  return null;
}

function draftNewListingEvent(
  asset: Asset,
  createdAt: string
): MarketEventDraft | null {
  const cutoff = Date.now() - NEW_LISTING_DAYS * 24 * 60 * 60 * 1000;
  if (new Date(asset.created_at).getTime() < cutoff) return null;

  return {
    asset_id: asset.id,
    event_type: "new_listing",
    headline: "New Listing on CultureDAQ",
    description: `${asset.name} recently joined the market and is attracting early attention.`,
    impact_score: 3,
    is_positive: true,
    expires_at: hoursFromNow(EVENT_TTL_HOURS.new_listing, new Date(createdAt)),
  };
}

function draftCultureMomentEvent(
  asset: Asset,
  moment: (typeof CULTURE_MOMENTS)[number],
  createdAt: string
): MarketEventDraft {
  return {
    asset_id: asset.id,
    event_type: "cultural_moment",
    headline: `${moment.title} Culture Moment Active`,
    description: `${moment.title} remains active — ${moment.description.charAt(0).toLowerCase()}${moment.description.slice(1)}`,
    impact_score: 4,
    is_positive: true,
    expires_at: hoursFromNow(EVENT_TTL_HOURS.cultural_moment, new Date(createdAt)),
  };
}

function buildDraftsForAsset(
  asset: Asset,
  movement: AssetRankMovement | undefined,
  categoryMomentum: Map<AssetCategory, number>,
  cultureMoment: (typeof CULTURE_MOMENTS)[number] | undefined,
  createdAt: string
): MarketEventDraft[] {
  const drafts: MarketEventDraft[] = [];

  if (movement) {
    const rankDraft = draftRankEvent(asset, movement, createdAt);
    if (rankDraft) drafts.push(rankDraft);
  }

  const categoryAvg = categoryMomentum.get(asset.category) ?? 0;
  const categoryDraft = draftCategoryTrendEvent(asset, categoryAvg, createdAt);
  if (categoryDraft) drafts.push(categoryDraft);

  const pressureDraft = draftPressureEvent(asset, createdAt);
  if (pressureDraft) drafts.push(pressureDraft);

  const momentumDraft = draftMomentumEvent(asset, createdAt);
  if (momentumDraft) drafts.push(momentumDraft);

  const listingDraft = draftNewListingEvent(asset, createdAt);
  if (listingDraft) drafts.push(listingDraft);

  if (cultureMoment) {
    drafts.push(draftCultureMomentEvent(asset, cultureMoment, createdAt));
  }

  return drafts;
}

async function fetchActiveEventKeys(
  supabase: SupabaseClient,
  assetIds: string[]
): Promise<Set<string>> {
  if (assetIds.length === 0) return new Set();

  const now = new Date().toISOString();
  const { data } = await supabase
    .from("market_events")
    .select("asset_id, event_type")
    .in("asset_id", assetIds)
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  const keys = new Set<string>();
  for (const row of data ?? []) {
    keys.add(`${row.asset_id}:${row.event_type}`);
  }
  return keys;
}

/**
 * Generate and persist market events for all assets during a market update cycle.
 */
export async function generateAssetEvents(
  supabase: SupabaseClient,
  options?: {
    assets?: Asset[];
    rankMovements?: Map<string, AssetRankMovement>;
    createdAt?: string;
    includeExternalSignals?: boolean;
  }
): Promise<GenerateAssetEventsResult> {
  const createdAt = options?.createdAt ?? new Date().toISOString();

  const assets =
    options?.assets ??
    ((await supabase.from("assets").select("*")).data as Asset[] | null) ??
    [];

  if (assets.length === 0) return { generated: 0, skipped: 0 };

  const rankMovements =
    options?.rankMovements ??
    (await getAssetRankMovementsMap(
      supabase,
      assets.map((a) => ({ id: a.id, current_price: a.current_price }))
    ));

  const categoryMomentum = calculateCategoryMomentum(assets);
  const cultureBySlug = buildCultureMomentBySlug();
  const activeKeys = await fetchActiveEventKeys(
    supabase,
    assets.map((a) => a.id)
  );

  const rows: Array<MarketEventDraft & { created_at: string }> = [];
  let skipped = 0;

  for (const asset of assets) {
    const drafts = buildDraftsForAsset(
      asset,
      rankMovements.get(asset.id),
      categoryMomentum,
      cultureBySlug.get(asset.slug),
      createdAt
    );

    for (const draft of drafts) {
      const key = `${draft.asset_id}:${draft.event_type}`;
      if (activeKeys.has(key)) {
        skipped++;
        continue;
      }
      rows.push({ ...draft, created_at: createdAt });
      activeKeys.add(key);
    }
  }

  if (options?.includeExternalSignals) {
    const external = [
      ...(await fetchSportsSignals()),
      ...(await fetchNewsSignals()),
      ...(await fetchSearchTrendSignals()),
      ...(await fetchSocialSignals()),
    ];

    for (const draft of external) {
      const key = `${draft.asset_id}:${draft.event_type}`;
      if (activeKeys.has(key)) {
        skipped++;
        continue;
      }
      rows.push({ ...draft, created_at: createdAt });
      activeKeys.add(key);
    }
  }

  if (rows.length === 0) return { generated: 0, skipped };

  const { error } = await supabase.from("market_events").insert(rows);
  if (error) throw new Error(error.message);

  return { generated: rows.length, skipped };
}

function isEventActive(event: MarketEvent, now = new Date()): boolean {
  if (!event.expires_at) return true;
  return new Date(event.expires_at).getTime() > now.getTime();
}

/** Most recent events for an asset (including expired). */
export async function getLatestAssetEvents(
  supabase: SupabaseClient,
  assetId: string,
  limit = 10
): Promise<MarketEvent[]> {
  const { data, error } = await supabase
    .from("market_events")
    .select("*")
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as MarketEvent[];
}

/** Non-expired events for an asset, ordered by impact then recency. */
export async function getActiveAssetEvents(
  supabase: SupabaseClient,
  assetId: string
): Promise<MarketEvent[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("market_events")
    .select("*")
    .eq("asset_id", assetId)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("impact_score", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as MarketEvent[]).filter((event) =>
    isEventActive(event)
  );
}

/** Format a stored market event as natural market commentary. */
export function formatMarketEventBullet(
  event: MarketEvent,
  category?: AssetCategory
): string | null {
  const categoryLabel = category ? CATEGORY_MARKET_LABELS[category] : null;

  switch (event.event_type) {
    case "rank_up":
    case "rank_down":
      return event.description.includes(": ")
        ? event.description.split(": ").slice(1).join(": ")
        : event.headline;
    case "category_trending": {
      const label =
        categoryLabel ??
        event.headline.replace(" Category Trending", "") + " assets";
      return event.is_positive
        ? `${label} are benefiting from strong category momentum`
        : `${label} have weakened across the market`;
    }
    case "buying_pressure":
      return "Fresh buying interest is supporting the price";
    case "selling_pressure":
      return "Recent selling activity has picked up";
    case "cultural_moment":
      return event.headline
        .replace(" Culture Moment Active", " remains active in the market")
        .replace(" Active", " remains active in the market");
    case "new_listing":
      return "Early market attention is building around this recent listing";
    case "market_momentum":
      return event.is_positive
        ? "Price momentum has been building across recent sessions"
        : "Recent momentum has cooled after earlier activity";
    default:
      return event.headline;
  }
}

/** @deprecated Use buildMovementBullets from movement-summary.ts */
export function buildMovementBulletsFromEvents(
  rankMovement: AssetRankMovement | null | undefined,
  events: MarketEvent[],
  maxBullets = 4
): string[] {
  void rankMovement;
  void maxBullets;
  return events
    .map((e) => formatMarketEventBullet(e))
    .filter((b): b is string => b != null)
    .slice(0, 4);
}
