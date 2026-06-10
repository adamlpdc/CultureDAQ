import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { CategorySpotlight } from "@/lib/queries";
import { CATEGORY_LABELS } from "@/lib/constants";
import { CATEGORY_EMOJI } from "@/lib/asset-visual";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { formatDaq, formatPercent, getPriceChange } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ROW_LABELS = [
  { key: "topAsset" as const, label: "Top Asset" },
  { key: "trending" as const, label: "Trending" },
  { key: "mostTraded" as const, label: "Most Traded" },
];

export function MarketCategorySpotlight({ spotlight }: { spotlight: CategorySpotlight }) {
  const { category, topAsset, trending, mostTraded } = spotlight;
  const picks = { topAsset, trending, mostTraded };
  const hasAny = topAsset || trending || mostTraded;

  if (!hasAny) return null;

  return (
    <Card className="overflow-hidden !p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-surface-muted/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-lg leading-none shadow-card"
            aria-hidden
          >
            {CATEGORY_EMOJI[category]}
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Category Spotlight
            </p>
            <h3 className="text-base font-bold text-foreground">
              {CATEGORY_LABELS[category]}
            </h3>
          </div>
        </div>
        <Link
          href={`/market?category=${category}`}
          className="shrink-0 text-[11px] font-semibold text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="divide-y divide-border/60">
        {ROW_LABELS.map(({ key, label }) => {
          const asset = picks[key];
          if (!asset) return null;
          const change = getPriceChange(asset.current_price, asset.previous_price);
          const isPositive = change >= 0;

          return (
            <Link
              key={key}
              href={`/asset/${asset.slug}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted/30"
            >
              <span className="w-20 shrink-0 text-[11px] font-semibold text-muted">
                {label}
              </span>
              <AssetIdentityFromAsset asset={asset} size="xs" className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
                {asset.name}
              </span>
              <div className="shrink-0 text-right">
                <p className="text-stat daq-price text-xs font-bold text-foreground">
                  {formatDaq(asset.current_price)}
                </p>
                <p
                  className={cn(
                    "text-[10px] font-semibold",
                    isPositive ? "text-gain" : "text-loss"
                  )}
                >
                  {formatPercent(change)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
