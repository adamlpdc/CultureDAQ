"use client";

import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";
import type { AssetRankMovement } from "@/types/database";
import type { WatchlistItemWithAsset } from "@/lib/watchlist";
import { formatWatchlistCountShort } from "@/lib/watchlist-events";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { RankMovement } from "@/components/assets/rank-movement";
import { WatchButton } from "@/components/watchlist/watch-button";
import { CategoryBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";

interface PortfolioWatchlistProps {
  items: WatchlistItemWithAsset[];
  rankMovements: Record<string, AssetRankMovement>;
  isLoggedIn: boolean;
}

export function PortfolioWatchlist({
  items,
  rankMovements,
  isLoggedIn,
}: PortfolioWatchlistProps) {
  const count = items.length;
  const preview = items.slice(0, 3);

  if (count === 0) {
    return (
      <Card className="!p-4 md:!p-5">
        <CardHeader className="mb-2">
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-muted" />
            <CardTitle className="text-sm text-foreground-secondary">Your Watchlist</CardTitle>
          </div>
        </CardHeader>
        <p className="mb-3 text-[11px] leading-relaxed text-muted">
          Track assets before you buy.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/watchlist">
            <Button variant="secondary" size="sm" className="w-full text-xs">
              View Full Watchlist
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href="/market">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              Explore Market
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="!p-4 md:!p-5">
      <CardHeader className="mb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-muted" />
            <CardTitle className="text-sm text-foreground-secondary">Your Watchlist</CardTitle>
          </div>
          <span className="rounded-md border border-primary/20 bg-primary-light/50 px-2 py-0.5 text-[10px] font-bold text-primary">
            {formatWatchlistCountShort(count)}
          </span>
        </div>
      </CardHeader>
      <p className="mb-2.5 text-[11px] leading-relaxed text-muted">
        See what moved before you decide to trade.
      </p>
      <div className="space-y-1.5">
        {preview.map((item) => {
          const change = getPriceChange(
            item.asset.current_price,
            item.asset.previous_price
          );
          const isPositive = change >= 0;
          const movement = rankMovements[item.asset_id] ?? null;
          return (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-surface-muted/20 px-2.5 py-2"
            >
              <Link
                href={`/asset/${item.asset.slug}`}
                className="flex min-w-0 flex-1 items-center gap-2.5 transition-colors hover:opacity-90"
              >
                <AssetIdentityFromAsset asset={item.asset} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-foreground">
                    {item.asset.name}
                  </p>
                  <CategoryBadge size="xs" className="mt-0.5 w-fit" category={item.asset.category} />
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-stat daq-price text-[10px] font-medium text-foreground">
                    {formatDaq(item.asset.current_price)}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] font-semibold",
                      isPositive ? "text-gain" : "text-loss"
                    )}
                  >
                    {formatPercent(change)}
                  </p>
                  {movement && (
                    <div className="mt-0.5 flex justify-end">
                      <RankMovement movement={movement} size="xs" />
                    </div>
                  )}
                </div>
              </Link>
              <WatchButton
                assetId={item.asset_id}
                initialWatched
                isLoggedIn={isLoggedIn}
                variant="icon"
              />
            </div>
          );
        })}
      </div>
      <Link href="/watchlist" className="mt-3 block">
        <Button variant="secondary" size="sm" className="w-full text-xs font-semibold">
          View Full Watchlist
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </Card>
  );
}
