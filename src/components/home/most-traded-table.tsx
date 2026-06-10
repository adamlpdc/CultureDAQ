import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Asset } from "@/types/database";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";

interface MostTradedTableProps {
  assets: Asset[];
}

function formatVolume(vol: number): string {
  if (vol >= 1000) return `${(vol / 1000).toFixed(0)}K`;
  return vol.toLocaleString();
}

const colGrid =
  "grid-cols-[1.5rem_minmax(0,1fr)_6rem_4.25rem_3.75rem]";

export function MostTradedTable({ assets }: MostTradedTableProps) {
  if (assets.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No trades yet"
        description="Trade activity will appear as trading picks up."
      />
    );
  }

  return (
    <div>
      <div
        className={cn(
          "mb-1.5 grid gap-4 border-b border-border pb-2 text-[10px] font-semibold uppercase tracking-wide text-muted",
          colGrid
        )}
      >
        <span>#</span>
        <span>Asset</span>
        <span className="text-right">Price</span>
        <span className="text-right">Trades</span>
        <span className="text-right">Chg</span>
      </div>
      <div className="divide-y divide-border">
        {assets.map((asset, index) => {
          const change = getPriceChange(asset.current_price, asset.previous_price);
          const isPositive = change >= 0;

          return (
            <Link
              key={asset.id}
              href={`/asset/${asset.slug}`}
              className={cn(
                "grid items-center gap-4 py-2.5 text-xs transition-colors hover:bg-surface-muted/40",
                colGrid
              )}
            >
              <span className="text-stat font-bold text-muted">{index + 1}</span>
              <p className="truncate font-semibold text-foreground">{asset.name}</p>
              <p className="text-stat daq-price text-right font-medium text-foreground">
                {formatDaq(asset.current_price)}
              </p>
              <p className="text-stat text-right text-muted">
                {formatVolume(asset.trade_volume_24h)}
              </p>
              <p
                className={cn(
                  "flex items-center justify-end gap-0.5 font-bold",
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
