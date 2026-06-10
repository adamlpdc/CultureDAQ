"use client";

import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Asset } from "@/types/database";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";

interface MarketTickerProps {
  assets: Asset[];
}

export function MarketTicker({ assets }: MarketTickerProps) {
  if (assets.length === 0) return null;

  const items = [...assets, ...assets];

  return (
    <div className="border-b border-border bg-secondary text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-hidden px-4 py-2 lg:px-6">
        <div className="flex shrink-0 items-center gap-2 border-r border-white/20 pr-4">
          <span className="live-dot h-2 w-2 rounded-full bg-gain" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/90">
            Live Market
          </span>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="ticker-track flex w-max gap-10">
            {items.map((asset, i) => (
              <TickerItem key={`${asset.id}-${i}`} asset={asset} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TickerItem({ asset }: { asset: Asset }) {
  const change = getPriceChange(asset.current_price, asset.previous_price);
  const isPositive = change >= 0;

  return (
    <Link
      href={`/asset/${asset.slug}`}
      className="flex shrink-0 items-center gap-3 text-sm transition-opacity hover:opacity-80"
    >
      <span className="font-medium text-white">{asset.name}</span>
      <span className="text-stat daq-price font-semibold text-white/90">
        {formatDaq(asset.current_price)}
      </span>
      <span
        className={cn(
          "flex items-center gap-0.5 text-xs font-semibold",
          isPositive ? "text-gain-muted" : "text-loss-muted"
        )}
      >
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        {formatPercent(change)}
      </span>
    </Link>
  );
}
