import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { MarketInsightCards } from "@/lib/queries";
import { ALL_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { CATEGORY_EMOJI } from "@/lib/asset-visual";
import type { AssetCategory } from "@/types/database";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { cn, formatPercent, getPriceChange } from "@/lib/utils";

interface MarketHeaderProps {
  totalAssets: number;
  insights: MarketInsightCards;
}

const PULSE_ITEMS = [
  { key: "topGainer" as const, emoji: "🚀", label: "Top Gainer" },
  { key: "biggestLoser" as const, emoji: "📉", label: "Biggest Loser" },
  { key: "mostTraded" as const, emoji: "💰", label: "Most Traded" },
  { key: "newListing" as const, emoji: "🆕", label: "Newest Listing" },
];

function PulseCard({
  emoji,
  label,
  asset,
}: {
  emoji: string;
  label: string;
  asset: MarketInsightCards["topGainer"];
}) {
  if (!asset) {
    return (
      <div className="rounded-xl border border-border/80 bg-surface-muted/30 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
          {emoji} {label}
        </p>
        <p className="mt-1 text-xs text-muted">—</p>
      </div>
    );
  }

  const change = getPriceChange(asset.current_price, asset.previous_price);
  const isPositive = change >= 0;

  return (
    <Link
      href={`/asset/${asset.slug}`}
      className="block rounded-xl border border-border/80 bg-surface-muted/30 px-3 py-2.5 transition-all hover:border-border-tint hover:bg-surface-muted/50"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
        {emoji} {label}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <AssetIdentityFromAsset asset={asset} size="xs" />
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
          {asset.name}
        </p>
        <p
          className={cn(
            "shrink-0 text-[11px] font-bold",
            isPositive ? "text-gain" : "text-loss"
          )}
        >
          {formatPercent(change)}
        </p>
      </div>
    </Link>
  );
}

export function MarketHeader({ totalAssets, insights }: MarketHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-tint bg-surface p-4 shadow-elevated md:p-5">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary-light/40 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Market
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              Discover cultural assets worth buying — trending, rising, and new.
            </p>
          </div>
          <p className="text-[11px] font-medium text-muted">
            {totalAssets.toLocaleString()} assets · Live prices{" "}
            <span className="live-dot ml-1 inline-block h-2 w-2 rounded-full bg-gain align-middle" />
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {ALL_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/market?category=${cat}`}
              className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-surface-muted/40 px-2 py-1 text-[10px] font-semibold text-foreground-secondary transition-colors hover:border-border-tint hover:bg-surface-muted"
            >
              <span aria-hidden>{CATEGORY_EMOJI[cat as AssetCategory]}</span>
              {CATEGORY_LABELS[cat]}
            </Link>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/60 pt-4 sm:grid-cols-4">
          {PULSE_ITEMS.map(({ key, emoji, label }) => (
            <PulseCard key={key} emoji={emoji} label={label} asset={insights[key]} />
          ))}
        </div>
      </div>
    </div>
  );
}
