import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Asset } from "@/types/database";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { CategoryBadge } from "@/components/ui/badge";
import { cn, formatPercent, getPriceChange } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";

interface MoverListProps {
  assets: Asset[];
}

export function MoverList({ assets }: MoverListProps) {
  if (assets.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No movers"
        description="No price movement in this period."
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-between divide-y divide-border">
      {assets.slice(0, 5).map((asset, index) => {
        const change = getPriceChange(asset.current_price, asset.previous_price);
        const isPositive = change >= 0;

        return (
          <Link
            key={asset.id}
            href={`/asset/${asset.slug}`}
            className="flex min-h-[44px] items-center gap-2.5 py-2.5 transition-colors hover:bg-surface-muted/40"
          >
            <span className="text-stat w-4 shrink-0 text-xs font-bold text-muted">
              {index + 1}
            </span>
            <AssetIdentityFromAsset asset={asset} size="xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{asset.name}</p>
              <CategoryBadge size="xs" className="mt-0.5 w-fit" category={asset.category} />
            </div>
            <p
              className={cn(
                "flex shrink-0 items-center gap-0.5 text-xs font-bold",
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
          </Link>
        );
      })}
    </div>
  );
}
