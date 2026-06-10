import Link from "next/link";
import { Package } from "lucide-react";
import type { HoldingWithAsset } from "@/types/database";
import { AssetAvatarFromAsset } from "@/components/assets/asset-avatar";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface HoldingsListProps {
  holdings: HoldingWithAsset[];
}

export function HoldingsList({ holdings }: HoldingsListProps) {
  if (holdings.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No holdings yet"
        description="Explore the market and build your first cultural portfolio."
        action={
          <Link href="/market">
            <Button>Explore Market</Button>
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
            <Card className="transition-all hover:border-border-tint hover:shadow-card-hover">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <AssetAvatarFromAsset asset={holding.asset} size="sm" />
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-foreground">
                      {holding.asset.name}
                    </h3>
                    <p className="text-sm text-muted">
                      {holding.shares} shares @ {formatDaq(holding.avg_cost)} avg
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-foreground">{formatDaq(value)}</p>
                  <p className={cn("text-sm font-medium", pnl >= 0 ? "text-gain" : "text-loss")}>
                    {formatPercent(pnl)} P&L
                  </p>
                  <p className={cn("text-xs", change >= 0 ? "text-gain" : "text-loss")}>
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
