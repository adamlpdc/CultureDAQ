import { Suspense } from "react";
import { MarketAssetGrid } from "@/components/market/market-asset-grid";
import { MarketCategoryExplorer } from "@/components/market/market-category-explorer";
import { MarketCategorySpotlight } from "@/components/market/market-category-spotlight";
import { MarketDiscovery } from "@/components/market/market-discovery";
import { MarketFilters } from "@/components/market/market-filters";
import { MarketHeader } from "@/components/market/market-header";
import { LoadingSpinner } from "@/components/ui/loading";
import { buildMarketBadgeContext, getMarketStatuses } from "@/lib/market-helpers";
import {
  getAssets,
  getCategoryCounts,
  getCategorySpotlight,
  getMarketInsightCards,
  getMarketRankMap,
  getMarketStats,
  getNewListings,
} from "@/lib/queries";
import type { AssetCategory, MarketSort } from "@/types/database";

interface MarketPageProps {
  searchParams: Promise<{
    category?: AssetCategory;
    sort?: MarketSort;
    q?: string;
  }>;
}

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const params = await searchParams;
  const sort = params.sort ?? "trending";
  const search = params.q;
  const hasSearch = Boolean(search?.trim());

  const [
    stats,
    insights,
    categoryCounts,
    rankMap,
    explorerAssets,
    trending,
    gainers,
    losers,
    newListings,
    mostTraded,
    spotlight,
    momentumPool,
  ] = await Promise.all([
    getMarketStats(),
    getMarketInsightCards(),
    getCategoryCounts(),
    getMarketRankMap(),
    getAssets({
      category: params.category,
      sort,
      search,
    }),
    getAssets({ sort: "trending", limit: 6 }),
    getAssets({ sort: "gainers", limit: 5 }),
    getAssets({ sort: "losers", limit: 5 }),
    getNewListings(5),
    getAssets({ sort: "most_traded", limit: 5 }),
    getCategorySpotlight(),
    getAssets({ sort: "trending", limit: 30 }),
  ]);

  const badgeContext = buildMarketBadgeContext(
    trending,
    gainers,
    losers,
    newListings,
    mostTraded,
    momentumPool
  );

  const explorerItems = explorerAssets.map((asset) => ({
    asset,
    marketRank: rankMap.get(asset.id),
    statuses: getMarketStatuses(asset, badgeContext),
  }));

  const hasActiveFilters = Boolean(params.category || hasSearch || sort !== "trending");
  const showDiscovery = !hasSearch && !hasActiveFilters;

  return (
    <div className="space-y-5 md:space-y-6">
      <MarketHeader totalAssets={stats.totalAssets} insights={insights} />

      <Suspense fallback={<LoadingSpinner />}>
        <MarketFilters />
      </Suspense>

      {showDiscovery && (
        <MarketDiscovery
          trending={trending}
          gainers={gainers}
          losers={losers}
          newListings={newListings}
          mostTraded={mostTraded}
        />
      )}

      <MarketAssetGrid items={explorerItems} hasActiveFilters={hasActiveFilters} />

      <div className="space-y-5 border-t border-border/60 pt-5 md:space-y-6">
        <MarketCategorySpotlight spotlight={spotlight} />
        <MarketCategoryExplorer counts={categoryCounts} />
      </div>
    </div>
  );
}
