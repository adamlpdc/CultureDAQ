/**
 * Future external signal integration points.
 * Wire these into generateAssetEvents() when APIs are available.
 */

import type { MarketEventDraft } from "@/lib/market-events";

/** Sports results, fixtures, standings (e.g. ESPN, Sportradar). */
export async function fetchSportsSignals(): Promise<MarketEventDraft[]> {
  return [];
}

/** News headlines and sentiment (e.g. NewsAPI, GDELT). */
export async function fetchNewsSignals(): Promise<MarketEventDraft[]> {
  return [];
}

/** Search interest spikes (e.g. Google Trends). */
export async function fetchSearchTrendSignals(): Promise<MarketEventDraft[]> {
  return [];
}

/** Social buzz and engagement (e.g. X, TikTok, Reddit). */
export async function fetchSocialSignals(): Promise<MarketEventDraft[]> {
  return [];
}
