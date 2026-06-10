import Link from "next/link";
import { Package } from "lucide-react";
import type { HoldingWithAsset } from "@/types/database";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";

interface HoldingsListProps {
  holdings: HoldingWithAsset[];
}

export function HoldingsList({ holdings }: HoldingsListProps) {
  if (holdings.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No holdings yet"
        description="Browse the market and buy shares in your favorite cultural assets."
        action={
          <Link
            href="/market"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Explore Market
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {holdings.map((holding) => {
        const value = holding.shares * holding.asset.current_price;
        const cost = holding.shares * holding.avg_cost;
        const pnl = cost > 0 ? ((value - cost) / cost) * 100 : 0;
        const change = getPriceChange(
          holding.asset.current_price,
          holding.asset.previous_price
        );

        return (
          <Link key={holding.id} href={`/asset/${holding.asset.slug}`}>
            <Card className="transition-colors hover:border-accent/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{holding.asset.name}</h3>
                  <p className="text-sm text-muted">
                    {holding.shares} shares @ {formatDaq(holding.avg_cost)} avg
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatDaq(value)}</p>
                  <p
                    className={cn(
                      "text-sm",
                      pnl >= 0 ? "text-gain" : "text-loss"
                    )}
                  >
                    {formatPercent(pnl)} P&L
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      change >= 0 ? "text-gain" : "text-loss"
                    )}
                  >
                    {formatPercent(change)} today
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
