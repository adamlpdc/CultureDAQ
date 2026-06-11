import Link from "next/link";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import type { Asset, AssetRankMovement } from "@/types/database";
import { RankMovement } from "@/components/assets/rank-movement";
import { WatchButton } from "@/components/watchlist/watch-button";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { Badge, CategoryBadge, FeaturedBadge } from "@/components/ui/badge";
import { CATEGORY_EMOJI } from "@/lib/asset-visual";
import { CATEGORY_LABELS } from "@/lib/constants";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";

interface AssetIdentityHeaderProps {
  asset: Asset;
  marketRank?: number;
  rankMovement?: AssetRankMovement | null;
  isWatched?: boolean;
  isLoggedIn?: boolean;
}

export function AssetIdentityHeader({
  asset,
  marketRank,
  rankMovement,
  isWatched = false,
  isLoggedIn = false,
}: AssetIdentityHeaderProps) {
  const change = getPriceChange(asset.current_price, asset.previous_price);
  const isPositive = change >= 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card md:p-5">
      <Link
        href={`/market?category=${asset.category}`}
        className="mb-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {CATEGORY_EMOJI[asset.category]} {CATEGORY_LABELS[asset.category]}
      </Link>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4 md:gap-5">
          <AssetIdentityFromAsset asset={asset} size="hero" premium />
          <div className="min-w-0 pt-0.5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <CategoryBadge category={asset.category} />
              {asset.featured && <FeaturedBadge />}
              {marketRank && (
                <Badge className="border-border bg-surface-muted text-muted">
                  #{marketRank} in market
                </Badge>
              )}
              {asset.trading_paused && (
                <Badge className="border-loss-muted bg-loss-light text-loss">
                  Trading Paused
                </Badge>
              )}
              <WatchButton
                assetId={asset.id}
                initialWatched={isWatched}
                isLoggedIn={isLoggedIn}
                redirectPath={`/asset/${asset.slug}`}
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {asset.name}
            </h1>
            {asset.description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                {asset.description}
              </p>
            )}
            {marketRank != null && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <div>
                  <span className="font-semibold text-muted">Current Rank </span>
                  <span className="text-stat font-bold text-foreground">#{marketRank}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted">Rank Movement </span>
                  <RankMovement movement={rankMovement} size="sm" />
                </div>
                {rankMovement?.previousRank != null && !rankMovement.isNewlyRanked && (
                  <div>
                    <span className="font-semibold text-muted">Previous Rank </span>
                    <span className="text-stat font-bold text-foreground-secondary">
                      #{rankMovement.previousRank}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-border/80 bg-surface-muted/40 px-4 py-3 lg:text-right">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Current Price
          </p>
          <p className="text-stat daq-price mt-0.5 text-3xl font-bold text-foreground">
            {formatDaq(asset.current_price)}
          </p>
          <div
            className={cn(
              "mt-1.5 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-sm font-semibold",
              isPositive ? "bg-gain-light text-gain" : "bg-loss-light text-loss"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {formatPercent(change)}
          </div>
        </div>
      </div>
    </div>
  );
}
