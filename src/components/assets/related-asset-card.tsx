import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Asset } from "@/types/database";
import type { RelatedAssetReason } from "@/lib/queries";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { CategoryBadge } from "@/components/ui/badge";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";

const REASON_LABELS: Record<RelatedAssetReason, string> = {
  same_category: "Same Category",
  culture_moment: "Shared Culture Moment",
  trending_together: "Trending Together",
};

interface RelatedAssetCardProps {
  asset: Asset;
  reason: RelatedAssetReason;
}

export function RelatedAssetCard({ asset, reason }: RelatedAssetCardProps) {
  const change = getPriceChange(asset.current_price, asset.previous_price);
  const isPositive = change >= 0;

  return (
    <Link
      href={`/asset/${asset.slug}`}
      className="group flex items-center gap-3 rounded-xl border border-border/80 bg-surface-muted/30 p-3.5 transition-all hover:border-border-tint hover:bg-surface hover:shadow-card"
    >
      <AssetIdentityFromAsset asset={asset} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary">
          {asset.name}
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary/80">
          {REASON_LABELS[reason]}
        </p>
        <CategoryBadge size="xs" className="mt-1 w-fit" category={asset.category} />
      </div>
      <div className="shrink-0 text-right">
        <p className="text-stat daq-price text-xs font-bold text-foreground">
          {formatDaq(asset.current_price)}
        </p>
        <p
          className={cn(
            "mt-0.5 flex items-center justify-end gap-0.5 text-[10px] font-bold",
            isPositive ? "text-gain" : "text-loss"
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-2.5 w-2.5" />
          ) : (
            <TrendingDown className="h-2.5 w-2.5" />
          )}
          {formatPercent(change)}
        </p>
      </div>
    </Link>
  );
}
