import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Asset, AssetRankMovement } from "@/types/database";
import { RankMovement, RankPill } from "@/components/assets/rank-movement";
import type { MarketStatus } from "@/lib/market-helpers";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { WatchButton } from "@/components/watchlist/watch-button";
import { CategoryBadge } from "@/components/ui/badge";
import { MarketStatusBadgeGroup } from "@/components/market/market-status-badge";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";

interface MarketAssetCardProps {
  asset: Asset;
  marketRank?: number;
  rankMovement?: AssetRankMovement | null;
  statuses?: MarketStatus[];
  isWatched?: boolean;
  isLoggedIn?: boolean;
}

export function MarketAssetCard({
  asset,
  marketRank,
  rankMovement,
  statuses = [],
  isWatched = false,
  isLoggedIn = false,
}: MarketAssetCardProps) {
  const change = getPriceChange(asset.current_price, asset.previous_price);
  const isPositive = change >= 0;
  const showRankChange =
    rankMovement &&
    !rankMovement.isNewlyRanked &&
    rankMovement.rankChange != null &&
    rankMovement.rankChange !== 0;

  return (
    <div className="group relative flex h-full flex-col rounded-2xl border border-border bg-surface p-3 transition-all hover:border-border-tint hover:shadow-card-hover">
      <div className="absolute right-2.5 top-2.5 z-10">
        <WatchButton
          assetId={asset.id}
          initialWatched={isWatched}
          isLoggedIn={isLoggedIn}
          variant="icon"
          redirectPath="/market"
        />
      </div>
      <Link href={`/asset/${asset.slug}`} className="flex h-full flex-col">
        <div className="flex items-start gap-2.5 pr-7">
          <AssetIdentityFromAsset asset={asset} size="md" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-sm font-bold text-foreground group-hover:text-primary">
                {asset.name}
              </h3>
              {marketRank != null && <RankPill rank={marketRank} className="shrink-0" />}
            </div>
            <CategoryBadge size="xs" className="mt-1 w-fit" category={asset.category} />
            <MarketStatusBadgeGroup
              statuses={statuses}
              size="xs"
              className="mt-1"
              max={2}
            />
          </div>
        </div>

        <div className="mt-2.5 flex items-end justify-between gap-2 border-t border-border/50 pt-2.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Price
            </p>
            <p className="text-stat daq-price text-sm font-bold text-foreground">
              {formatDaq(asset.current_price)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              24H
            </p>
            <div className="flex items-center justify-end gap-1.5">
              {showRankChange && (
                <RankMovement
                  rankChange={rankMovement.rankChange}
                  size="xs"
                />
              )}
              <p
                className={cn(
                  "flex items-center gap-0.5 text-sm font-bold",
                  isPositive ? "text-gain" : "text-loss"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {formatPercent(change)}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
