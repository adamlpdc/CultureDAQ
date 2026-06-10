import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Asset } from "@/types/database";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { CategoryBadge } from "@/components/ui/badge";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";

interface HeroShowcaseProps {
  assets: Asset[];
}

export function HeroShowcase({ assets }: HeroShowcaseProps) {
  if (assets.length === 0) {
    return (
      <div className="hidden min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-border bg-surface-muted/30 md:flex">
        <p className="text-sm text-muted">Assets across every category</p>
      </div>
    );
  }

  return (
    <div className="mx-auto hidden w-full max-w-md md:block lg:self-center">
      <div className="rounded-2xl bg-gradient-to-br from-primary-subtle/30 via-transparent to-gold-subtle/20 p-3">
        <div className="grid grid-cols-2 gap-2.5">
          {assets.slice(0, 4).map((asset, i) => {
            const change = getPriceChange(asset.current_price, asset.previous_price);
            const isPositive = change >= 0;

            return (
              <Link
                key={asset.id}
                href={`/asset/${asset.slug}`}
                className={cn(
                  "flex min-h-[96px] flex-col rounded-xl border border-border bg-surface p-2.5 shadow-card transition-all hover:shadow-card-hover",
                  i % 2 === 1 && "mt-4"
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <AssetIdentityFromAsset asset={asset} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-bold leading-tight text-foreground">
                      {asset.name}
                    </p>
                    <CategoryBadge size="xs" className="mt-1 w-fit" category={asset.category} />
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <p className="text-stat daq-price text-xs font-bold text-foreground">
                    {formatDaq(asset.current_price)}
                  </p>
                  <p
                    className={cn(
                      "flex items-center gap-0.5 text-[11px] font-bold",
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
      </div>
    </div>
  );
}
