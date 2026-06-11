"use client";

import { useState } from "react";
import Link from "next/link";
import type { Asset, AssetRankMovement } from "@/types/database";
import type { MarketStatus } from "@/lib/market-helpers";
import { MarketAssetCard } from "@/components/market/market-asset-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "lucide-react";

const INITIAL_COUNT = 12;
const LOAD_MORE_COUNT = 12;

export interface ExplorerAssetItem {
  asset: Asset;
  marketRank?: number;
  rankMovement?: AssetRankMovement | null;
  statuses: MarketStatus[];
}

interface MarketAssetGridProps {
  items: ExplorerAssetItem[];
  hasActiveFilters?: boolean;
  watchedAssetIds?: string[];
  isLoggedIn?: boolean;
}

export function MarketAssetGrid({
  items,
  hasActiveFilters = false,
  watchedAssetIds = [],
  isLoggedIn = false,
}: MarketAssetGridProps) {
  const watchedSet = new Set(watchedAssetIds);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No assets match your filters"
        description="Try a different category, search term, or market view to discover more opportunities."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/market?sort=trending">
              <Button size="sm">View Trending</Button>
            </Link>
            <Link href="/market">
              <Button variant="secondary" size="sm">
                Clear Filters
              </Button>
            </Link>
          </div>
        }
      />
    );
  }

  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-card md:p-5">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">Asset Explorer</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            Browse and compare — click any asset to explore.
          </p>
        </div>
        <p className="shrink-0 text-[11px] text-muted">
          {items.length} total
          {hasActiveFilters ? " · filtered" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4 lg:grid-cols-3">
        {visible.map(({ asset, marketRank, rankMovement, statuses }) => (
          <MarketAssetCard
            key={asset.id}
            asset={asset}
            marketRank={marketRank}
            rankMovement={rankMovement}
            statuses={statuses}
            isWatched={watchedSet.has(asset.id)}
            isLoggedIn={isLoggedIn}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-4 flex flex-col items-center gap-2 border-t border-border/60 pt-4">
          <p className="text-[11px] text-muted">
            Showing {visible.length} of {items.length} assets
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setVisibleCount((n) => n + LOAD_MORE_COUNT)}
          >
            Load More
          </Button>
        </div>
      )}
    </section>
  );
}
