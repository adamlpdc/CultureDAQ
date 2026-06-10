import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Asset } from "@/types/database";
import type { MarketInsightCards } from "@/lib/queries";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";

const INSIGHT_CONFIG = [
  { key: "trending" as const, emoji: "🔥", label: "Trending Asset" },
  { key: "topGainer" as const, emoji: "🚀", label: "Top Gainer" },
  { key: "biggestLoser" as const, emoji: "📉", label: "Biggest Loser" },
  { key: "newListing" as const, emoji: "🆕", label: "New Listing" },
  { key: "mostTraded" as const, emoji: "💰", label: "Most Traded" },
];

function InsightCard({
  emoji,
  label,
  asset,
}: {
  emoji: string;
  label: string;
  asset: Asset | null;
}) {
  if (!asset) {
    return (
      <div className="rounded-xl border border-border/80 bg-surface-muted/20 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
          {emoji} {label}
        </p>
        <p className="mt-2 text-xs text-muted">—</p>
      </div>
    );
  }

  const change = getPriceChange(asset.current_price, asset.previous_price);
  const isPositive = change >= 0;

  return (
    <Link
      href={`/asset/${asset.slug}`}
      className="block rounded-xl border border-border/80 bg-surface-muted/20 p-3 transition-all hover:border-border-tint hover:bg-surface-muted/40 hover:shadow-card"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
        {emoji} {label}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <AssetIdentityFromAsset asset={asset} size="xs" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">{asset.name}</p>
          <p
            className={cn(
              "mt-0.5 flex items-center gap-0.5 text-[10px] font-bold",
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
        <p className="text-stat daq-price shrink-0 text-[11px] font-bold text-foreground">
          {formatDaq(asset.current_price)}
        </p>
      </div>
    </Link>
  );
}

export function MarketInsights({ insights }: { insights: MarketInsightCards }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {INSIGHT_CONFIG.map(({ key, emoji, label }) => (
        <InsightCard
          key={key}
          emoji={emoji}
          label={label}
          asset={insights[key]}
        />
      ))}
    </div>
  );
}
