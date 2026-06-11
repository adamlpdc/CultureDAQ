"use client";

import Link from "next/link";
import type { Asset } from "@/types/database";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { WatchButton } from "@/components/watchlist/watch-button";
import { CategoryBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Eye } from "lucide-react";
import { formatDaq, formatPercent, getPriceChange } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface WatchlistEmptySuggestionsProps {
  suggestions: Asset[];
  watchedAssetIds: string[];
  isLoggedIn: boolean;
}

export function WatchlistEmptySuggestions({
  suggestions,
  watchedAssetIds,
  isLoggedIn,
}: WatchlistEmptySuggestionsProps) {
  const watchedSet = new Set(watchedAssetIds);

  return (
    <div className="space-y-5">
      <EmptyState
        icon={Eye}
        title="Start your watchlist"
        description="Follow assets and see how they move before you buy."
        action={
          <Link href="/market">
            <Button size="sm">Explore Market</Button>
          </Link>
        }
      />

      {suggestions.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-card md:p-5">
          <h2 className="text-sm font-bold text-foreground">Popular Assets To Watch</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            Add a few names and check back when the market moves.
          </p>
          <div className="mt-3 space-y-2">
            {suggestions.map((asset) => {
              const change = getPriceChange(
                asset.current_price,
                asset.previous_price
              );
              const isPositive = change >= 0;
              return (
                <div
                  key={asset.id}
                  className="flex items-center gap-3 rounded-xl border border-border/80 bg-surface-muted/20 px-3 py-2.5"
                >
                  <Link
                    href={`/asset/${asset.slug}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <AssetIdentityFromAsset asset={asset} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {asset.name}
                      </p>
                      <CategoryBadge size="xs" className="mt-1 w-fit" category={asset.category} />
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-stat text-xs font-bold text-foreground">
                        {formatDaq(asset.current_price)}
                      </p>
                      <p
                        className={cn(
                          "text-[10px] font-semibold",
                          isPositive ? "text-gain" : "text-loss"
                        )}
                      >
                        {formatPercent(change)}
                      </p>
                    </div>
                  </Link>
                  <WatchButton
                    assetId={asset.id}
                    initialWatched={watchedSet.has(asset.id)}
                    isLoggedIn={isLoggedIn}
                    variant="default"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
