import { TrendingDown, TrendingUp } from "lucide-react";
import type { PortfolioSummary as PortfolioSummaryType } from "@/types/database";
import { cn, formatDaq, formatPercent } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { PortfolioChart } from "@/components/portfolio/portfolio-chart";

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType;
  history?: { total_value: number; recorded_at: string }[];
}

export function PortfolioSummaryCard({ summary, history = [] }: PortfolioSummaryProps) {
  const change = summary.day_change_percent;
  const isPositive = change !== null && change >= 0;

  return (
    <Card className="relative overflow-hidden border-border-tint bg-surface shadow-elevated">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-light/40 blur-2xl" />
      <div className="relative">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted">
                Your Portfolio
              </p>
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-gain" />
            </div>
            <p className="text-stat mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {formatDaq(summary.total_value)}
            </p>
            {change !== null && (
              <div
                className={cn(
                  "mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-semibold",
                  isPositive ? "bg-gain-light text-gain" : "bg-loss-light text-loss"
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

            <div className="mt-6 grid grid-cols-2 gap-4 sm:max-w-sm">
              <div className="rounded-xl border border-border/60 bg-surface-muted/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Cash Balance
                </p>
                <p className="text-stat mt-1 text-lg font-bold text-gold">
                  {formatDaq(summary.daq_balance)}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-surface-muted/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Portfolio Value
                </p>
                <p className="text-stat mt-1 text-lg font-bold text-foreground">
                  {formatDaq(summary.holdings_value)}
                </p>
              </div>
            </div>
          </div>

          <div className="w-full lg:max-w-md">
            <PortfolioChart data={history} currentValue={summary.total_value} />
          </div>
        </div>
      </div>
    </Card>
  );
}
