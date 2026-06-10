import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Asset } from "@/types/database";
import type { MarketStatus } from "@/lib/market-helpers";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { CategoryBadge } from "@/components/ui/badge";
import { MarketStatusBadgeGroup } from "@/components/market/market-status-badge";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";

interface MarketAssetCardProps {
  asset: Asset;
  marketRank?: number;
  statuses?: MarketStatus[];
}

export function MarketAssetCard({ asset, marketRank, statuses = [] }: MarketAssetCardProps) {
  const change = getPriceChange(asset.current_price, asset.previous_price);
  const isPositive = change >= 0;

  return (
    <Link
      href={`/asset/${asset.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-3 transition-all hover:border-border-tint hover:shadow-card-hover"
    >
      <div className="flex items-start gap-2.5">
        {marketRank != null && (
          <span className="text-stat flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg border border-border/80 bg-surface-muted/80 tabular-nums leading-none">
            <span className="text-[8px] font-semibold uppercase text-muted">#</span>
            <span className="text-sm font-bold text-foreground">{marketRank}</span>
          </span>
        )}
        <AssetIdentityFromAsset asset={asset} size="md" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-foreground group-hover:text-primary">
            {asset.name}
          </h3>
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
          <p
            className={cn(
              "flex items-center justify-end gap-0.5 text-sm font-bold",
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
    </Link>
  );
}
