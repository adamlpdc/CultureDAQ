import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Asset } from "@/types/database";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { CategoryBadge } from "@/components/ui/badge";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Zap } from "lucide-react";

interface TrendingGridProps {
  assets: Asset[];
}

export function TrendingGrid({ assets }: TrendingGridProps) {
  if (assets.length === 0) {
    return (
      <EmptyState icon={Zap} title="Nothing trending" description="Check back soon." />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {assets.slice(0, 6).map((asset, index) => {
        const change = getPriceChange(asset.current_price, asset.previous_price);
        const isPositive = change >= 0;

        return (
          <Link
            key={asset.id}
            href={`/asset/${asset.slug}`}
            className="group flex min-h-[88px] flex-col rounded-xl border border-border/80 bg-surface-muted/30 p-2.5 transition-all hover:border-border-tint hover:bg-surface hover:shadow-card"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-stat w-3 shrink-0 text-[10px] font-bold text-muted">
                {index + 1}
              </span>
              <AssetIdentityFromAsset asset={asset} size="xs" />
              <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground group-hover:text-primary">
                {asset.name}
              </p>
            </div>
            <CategoryBadge
              size="xs"
              className="mt-1 w-fit max-w-full"
              category={asset.category}
            />
            <div className="mt-auto flex items-center justify-between gap-1 pt-1">
              <p className="text-stat daq-price shrink-0 text-[11px] font-bold text-foreground">
                {formatDaq(asset.current_price)}
              </p>
              <p
                className={cn(
                  "flex shrink-0 items-center gap-0.5 text-[10px] font-bold",
                  isPositive ? "text-gain" : "text-loss"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {formatPercent(change)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
