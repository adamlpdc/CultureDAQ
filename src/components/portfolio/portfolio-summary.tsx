import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { PortfolioSummary as PortfolioSummaryType } from "@/types/database";
import { cn, formatDaq, formatPercent } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType;
}

export function PortfolioSummaryCard({ summary }: PortfolioSummaryProps) {
  const change = summary.day_change_percent;
  const isPositive = change !== null && change >= 0;

  return (
    <Card className="bg-gradient-to-br from-accent/10 to-surface">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">Total Portfolio Value</p>
          <p className="mt-1 text-3xl font-bold">{formatDaq(summary.total_value)}</p>
          {change !== null && (
            <div
              className={cn(
                "mt-2 flex items-center gap-1 text-sm font-medium",
                isPositive ? "text-gain" : "text-loss"
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {formatPercent(change)} today
            </div>
          )}
        </div>
        <div className="rounded-xl bg-accent/20 p-3">
          <Wallet className="h-6 w-6 text-accent" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted">DAQ Balance</p>
          <p className="font-semibold text-gold">{formatDaq(summary.daq_balance)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Holdings Value</p>
          <p className="font-semibold">{formatDaq(summary.holdings_value)}</p>
        </div>
      </div>
    </Card>
  );
}
