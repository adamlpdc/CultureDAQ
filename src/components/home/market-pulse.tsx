import Link from "next/link";
import { Activity, TrendingUp } from "lucide-react";
import type { Asset } from "@/types/database";
import { formatPercent, getPriceChange } from "@/lib/utils";

interface MarketPulseProps {
  topGainer: Asset | null;
  mostTraded: Asset | null;
  newListingCount: number;
  assetsMoving: number;
}

export function MarketPulse({
  topGainer,
  mostTraded,
  newListingCount,
  assetsMoving,
}: MarketPulseProps) {
  const gainerChange = topGainer
    ? getPriceChange(topGainer.current_price, topGainer.previous_price)
    : null;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm shadow-card">
      <div className="flex items-center gap-2 font-semibold text-foreground">
        <Activity className="h-4 w-4 text-gain" />
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-gain" />
        Market active
      </div>
      <span className="text-muted">
        <span className="font-semibold text-foreground">{assetsMoving}</span> assets moving
      </span>
      {topGainer && gainerChange !== null && (
        <Link
          href={`/asset/${topGainer.slug}`}
          className="flex items-center gap-1 font-semibold text-gain hover:underline"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Top gainer: {topGainer.name} {formatPercent(gainerChange)}
        </Link>
      )}
      {mostTraded && (
        <Link
          href={`/asset/${mostTraded.slug}`}
          className="text-muted hover:text-foreground"
        >
          Most traded:{" "}
          <span className="font-semibold text-foreground">{mostTraded.name}</span>
        </Link>
      )}
      {newListingCount > 0 && (
        <span className="text-muted">
          <span className="font-semibold text-primary">{newListingCount}</span> new listings
        </span>
      )}
    </div>
  );
}
