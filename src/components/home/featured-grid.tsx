import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Asset } from "@/types/database";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { CategoryBadge, FeaturedBadge } from "@/components/ui/badge";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Star } from "lucide-react";

interface FeaturedGridProps {
  assets: Asset[];
  panel?: boolean;
}

export function FeaturedGrid({ assets, panel = false }: FeaturedGridProps) {
  if (assets.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="No featured assets"
        description="Featured picks will appear here."
      />
    );
  }

  const items = panel ? assets.slice(0, 4) : assets;

  return (
    <div
      className={cn(
        panel
          ? "grid auto-rows-fr grid-cols-2 gap-2.5"
          : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      )}
    >
      {items.map((asset) => (
        <FeaturedCard key={asset.id} asset={asset} panel={panel} />
      ))}
    </div>
  );
}

function FeaturedCard({ asset, panel }: { asset: Asset; panel?: boolean }) {
  const change = getPriceChange(asset.current_price, asset.previous_price);
  const isPositive = change >= 0;

  return (
    <Link
      href={`/asset/${asset.slug}`}
      className={cn(
        "group flex h-full flex-col rounded-xl border border-gold-muted/50 bg-gradient-to-br from-gold-subtle/25 to-surface transition-all hover:border-gold-muted hover:shadow-card-hover",
        panel ? "p-3.5" : "p-4 shadow-card"
      )}
    >
      <div className="flex items-center gap-2.5">
        <AssetIdentityFromAsset asset={asset} size={panel ? "sm" : "lg"} />
        <FeaturedBadge />
      </div>
      <p className="mt-2.5 line-clamp-2 text-xs font-bold leading-tight text-foreground group-hover:text-primary">
        {asset.name}
      </p>
      <CategoryBadge className="mt-1.5 w-fit" category={asset.category} />
      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <p className="text-stat daq-price text-xs font-bold text-foreground">
          {formatDaq(asset.current_price)}
        </p>
        <p
          className={cn(
            "flex shrink-0 items-center gap-0.5 text-[11px] font-bold",
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
}
