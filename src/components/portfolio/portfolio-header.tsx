import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { PortfolioSummary } from "@/types/database";
import { cn, formatDaq, formatPercent } from "@/lib/utils";

interface PortfolioHeaderProps {
  summary: PortfolioSummary;
  totalReturnPercent: number;
  portfolioRank: number | null;
  categoriesCount: number;
}

function HeroStat({
  label,
  value,
  valueClassName,
  href,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  href?: string;
}) {
  const content = (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("text-stat mt-0.5 text-xs font-bold text-foreground", valueClassName)}>
        {value}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="transition-colors hover:opacity-80">
        {content}
      </Link>
    );
  }

  return content;
}

export function PortfolioHeader({
  summary,
  totalReturnPercent,
  portfolioRank,
  categoriesCount,
}: PortfolioHeaderProps) {
  const dayChange = summary.day_change_percent;
  const isDayPositive = dayChange !== null && dayChange >= 0;
  const isOverallPositive = totalReturnPercent >= 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-tint bg-surface p-4 shadow-elevated md:p-5">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary-light/40 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Portfolio Value
          </p>
          <span className="live-dot h-2 w-2 rounded-full bg-gain" />
        </div>
        <p className="text-stat daq-price mt-1.5 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          {formatDaq(summary.total_value)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {dayChange !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-semibold",
                isDayPositive ? "bg-gain-light text-gain" : "bg-loss-light text-loss"
              )}
            >
              {isDayPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {formatPercent(dayChange)} Today
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-semibold",
              isOverallPositive ? "bg-gain-light/60 text-gain" : "bg-loss-light/60 text-loss"
            )}
          >
            {isOverallPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {formatPercent(totalReturnPercent)} Overall
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/60 pt-4 sm:grid-cols-4">
          <HeroStat
            label="Portfolio Rank"
            value={portfolioRank ? `#${portfolioRank}` : "#--"}
            href="/leaderboard"
          />
          <HeroStat label="Holdings" value={summary.holdings_count} />
          <HeroStat label="Categories Owned" value={categoriesCount} />
          <HeroStat
            label="Total Return"
            value={formatPercent(totalReturnPercent)}
            valueClassName={isOverallPositive ? "text-gain" : "text-loss"}
          />
        </div>
      </div>
    </div>
  );
}
