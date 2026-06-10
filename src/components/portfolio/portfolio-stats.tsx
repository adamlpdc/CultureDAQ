import {
  ArrowUpDown,
  Layers,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { PortfolioSummary } from "@/types/database";
import type { HoldingMetrics } from "@/lib/portfolio-analytics";
import { cn, formatDaq, formatPercent } from "@/lib/utils";

interface PortfolioStatsProps {
  summary: PortfolioSummary;
  totalReturnPercent: number;
  totalReturnDaq: number;
  bestPerformer: HoldingMetrics | null;
  worstPerformer: HoldingMetrics | null;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-surface-muted/30 px-3 py-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className={cn("text-stat text-sm font-bold text-foreground", valueClassName)}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

export function PortfolioStats({
  summary,
  totalReturnPercent,
  totalReturnDaq,
  bestPerformer,
  worstPerformer,
}: PortfolioStatsProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <h2 className="mb-3 text-sm font-bold text-foreground">Summary</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="Cash Balance"
          value={formatDaq(summary.daq_balance)}
          valueClassName="text-gold"
        />
        <StatCard
          icon={<Layers className="h-3.5 w-3.5" />}
          label="Holdings Value"
          value={formatDaq(summary.holdings_value)}
        />
        <StatCard
          icon={<ArrowUpDown className="h-3.5 w-3.5" />}
          label="Holdings"
          value={summary.holdings_count}
          sub="assets owned"
        />
        <StatCard
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Total Return"
          value={formatPercent(totalReturnPercent)}
          sub={formatDaq(totalReturnDaq)}
          valueClassName={totalReturnPercent >= 0 ? "text-gain" : "text-loss"}
        />
        <StatCard
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Best Performer"
          value={
            bestPerformer
              ? bestPerformer.holding.asset.name.split(" ").slice(0, 2).join(" ")
              : "—"
          }
          sub={
            bestPerformer ? formatPercent(bestPerformer.returnPercent) : "No gains yet"
          }
          valueClassName="text-gain"
        />
        <StatCard
          icon={<TrendingDown className="h-3.5 w-3.5" />}
          label="Worst Performer"
          value={
            worstPerformer && worstPerformer.returnPercent < 0
              ? worstPerformer.holding.asset.name.split(" ").slice(0, 2).join(" ")
              : "—"
          }
          sub={
            worstPerformer && worstPerformer.returnPercent < 0
              ? formatPercent(worstPerformer.returnPercent)
              : "No losses"
          }
          valueClassName="text-loss"
        />
      </div>
    </div>
  );
}
