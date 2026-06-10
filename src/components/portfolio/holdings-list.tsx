import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { HoldingMetrics } from "@/lib/portfolio-analytics";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { CategoryBadge } from "@/components/ui/badge";
import { cn, formatDaq, formatPercent } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface HoldingCardProps {
  metrics: HoldingMetrics;
}

export function HoldingCard({ metrics }: HoldingCardProps) {
  const { holding, currentValue, costBasis, profitLoss, returnPercent } = metrics;
  const isPositive = returnPercent >= 0;
  const asset = holding.asset;

  return (
    <Link href={`/asset/${asset.slug}`} className="group block">
      <Card className="!p-4 transition-all group-hover:border-border-tint group-hover:shadow-card-hover md:!p-5">
        <div className="flex items-start gap-3.5">
          <AssetIdentityFromAsset asset={asset} size="md" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-foreground group-hover:text-primary">
                  {asset.name}
                </h3>
                <CategoryBadge size="sm" className="mt-1.5 w-fit" category={asset.category} />
              </div>
              <div
                className={cn(
                  "shrink-0 rounded-xl border px-3 py-2 text-right",
                  isPositive
                    ? "border-gain-muted/60 bg-gain-light/70"
                    : "border-loss-muted/60 bg-loss-light/70"
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  P / L
                </p>
                <p
                  className={cn(
                    "text-stat mt-0.5 text-base font-bold leading-none",
                    isPositive ? "text-gain" : "text-loss"
                  )}
                >
                  {profitLoss >= 0 ? "+" : "-"}
                  {formatDaq(Math.abs(profitLoss))}
                </p>
                <p
                  className={cn(
                    "mt-1 flex items-center justify-end gap-0.5 text-xs font-bold",
                    isPositive ? "text-gain" : "text-loss"
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {formatPercent(returnPercent)}
                </p>
              </div>
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Owned
                </p>
                <p className="text-stat mt-0.5 text-xs font-bold text-foreground">
                  {holding.shares.toLocaleString()} shares
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Avg Cost
                </p>
                <p className="text-stat daq-price mt-0.5 text-xs font-medium text-foreground">
                  {formatDaq(holding.avg_cost)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Current Price
                </p>
                <p className="text-stat daq-price mt-0.5 text-xs font-medium text-foreground">
                  {formatDaq(asset.current_price)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Value
                </p>
                <p className="text-stat daq-price mt-0.5 text-xs font-bold text-foreground">
                  {formatDaq(currentValue)}
                </p>
              </div>
            </div>

            <p className="mt-2.5 text-[10px] text-muted">
              Cost basis {formatDaq(costBasis)}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

interface HoldingsListProps {
  metrics: HoldingMetrics[];
}

export function HoldingsList({ metrics }: HoldingsListProps) {
  const sorted = [...metrics].sort((a, b) => b.currentValue - a.currentValue);

  return (
    <div className="space-y-3">
      {sorted.map((m) => (
        <HoldingCard key={m.holding.id} metrics={m} />
      ))}
    </div>
  );
}
