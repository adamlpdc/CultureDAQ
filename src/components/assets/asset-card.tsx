import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Asset } from "@/types/database";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { CategoryBadge, FeaturedBadge } from "@/components/ui/badge";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";

interface AssetCardProps {
  asset: Asset;
}

export function AssetCard({ asset }: AssetCardProps) {
  const change = getPriceChange(asset.current_price, asset.previous_price);
  const isPositive = change >= 0;

  return (
    <Link
      href={`/asset/${asset.slug}`}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-all duration-200 hover:border-border-tint hover:shadow-card-hover"
    >
      <AssetIdentityFromAsset asset={asset} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
            {asset.name}
          </h3>
          {asset.featured && <FeaturedBadge />}
        </div>
        <CategoryBadge className="mt-1.5" category={asset.category} />
      </div>
      <div className="shrink-0 text-right">
        <p className="text-stat text-lg font-bold text-foreground">
          {formatDaq(asset.current_price)}
        </p>
        <p
          className={cn(
            "mt-0.5 flex items-center justify-end gap-0.5 text-sm font-semibold",
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
        {asset.trade_volume_24h > 0 && (
          <p className="mt-1 text-xs text-muted-light">
            {asset.trade_volume_24h.toLocaleString()} vol
          </p>
        )}
      </div>
    </Link>
  );
}
