import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { TradeWithAsset } from "@/types/database";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { CategoryBadge } from "@/components/ui/badge";
import { formatDaq } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface PortfolioActivityProps {
  trades: TradeWithAsset[];
}

function formatTradeDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PortfolioActivity({ trades }: PortfolioActivityProps) {
  if (trades.length === 0) {
    return (
      <Card className="!p-4 md:!p-5">
        <CardHeader className="mb-2">
          <CardTitle className="text-sm">Recent Activity</CardTitle>
        </CardHeader>
        <p className="text-xs leading-relaxed text-muted">
          Your buys and sells will show up here once you start trading.
        </p>
      </Card>
    );
  }

  return (
    <Card className="!p-4 md:!p-5">
      <CardHeader className="mb-2">
        <CardTitle className="text-sm">Recent Activity</CardTitle>
      </CardHeader>
      <div className="divide-y divide-border">
        {trades.slice(0, 8).map((trade) => {
          const isBuy = trade.trade_type === "buy";
          return (
            <Link
              key={trade.id}
              href={`/asset/${trade.asset.slug}`}
              className="group block py-3.5 transition-colors hover:bg-surface-muted/30"
            >
              <div className="flex items-start gap-3">
                <AssetIdentityFromAsset
                  asset={trade.asset}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        isBuy ? "bg-gain-light text-gain" : "bg-loss-light text-loss"
                      )}
                    >
                      {isBuy ? (
                        <ArrowDownLeft className="h-3 w-3" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3" />
                      )}
                      {isBuy ? "Bought" : "Sold"}
                    </span>
                    <span className="truncate text-xs font-semibold text-foreground group-hover:text-primary">
                      {trade.asset.name}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <CategoryBadge size="xs" category={trade.asset.category} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted">
                    <span className="font-medium text-foreground-secondary">
                      {trade.shares.toLocaleString()} shares
                    </span>
                    {" · "}
                    {formatDaq(trade.price_per_share)} per share
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "text-stat daq-price text-xs font-bold",
                      isBuy ? "text-loss" : "text-gain"
                    )}
                  >
                    {isBuy ? "-" : "+"}
                    {formatDaq(trade.total_daq)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {formatTradeDate(trade.created_at)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
