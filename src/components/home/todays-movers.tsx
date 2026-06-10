import Link from "next/link";
import { Flame, TrendingDown, TrendingUp } from "lucide-react";
import type { Asset } from "@/types/database";
import { cn, formatPercent, getPriceChange } from "@/lib/utils";

interface TodaysMoversProps {
  gainers: Asset[];
  losers: Asset[];
}

export function TodaysMovers({ gainers, losers }: TodaysMoversProps) {
  const movers = [
    ...gainers.slice(0, 3).map((a) => ({ asset: a, direction: "up" as const })),
    ...losers.slice(0, 2).map((a) => ({ asset: a, direction: "down" as const })),
  ];

  if (movers.length === 0) return null;

  return (
    <div className="mt-8 rounded-2xl border border-border bg-surface-muted/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Flame className="h-4 w-4 text-gold" />
        <p className="text-sm font-bold text-foreground">Today&apos;s Movers</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {movers.map(({ asset, direction }) => {
          const change = getPriceChange(asset.current_price, asset.previous_price);
          const isUp = direction === "up";

          return (
            <Link
              key={asset.id}
              href={`/asset/${asset.slug}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-surface",
                isUp
                  ? "border-gain-muted/60 bg-gain-light/50 text-gain"
                  : "border-loss-muted/60 bg-loss-light/50 text-loss"
              )}
            >
              <span className="text-foreground">{asset.name}</span>
              <span className="flex items-center gap-0.5">
                {isUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {formatPercent(change)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
