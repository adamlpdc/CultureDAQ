import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Layers,
  Lightbulb,
  PieChart,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { CategoryAllocation, HoldingMetrics } from "@/lib/portfolio-analytics";
import {
  getHighestConcentration,
  getLowestReturnHolding,
  getMostValuableHolding,
  getUnheldCategories,
} from "@/lib/portfolio-analytics";
import { CATEGORY_LABELS } from "@/lib/constants";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { CategoryBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDaq, formatPercent } from "@/lib/utils";

interface PortfolioInsightsProps {
  metrics: HoldingMetrics[];
  allocation: CategoryAllocation[];
}

function InsightTile({
  label,
  icon,
  children,
  href,
  className,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const inner = (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border border-border/80 bg-surface-muted/20 p-3 transition-colors",
        href && "hover:border-border-tint hover:bg-surface-muted/40",
        className
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }

  return inner;
}

function AssetInsightBody({
  metrics,
  showReturn = true,
}: {
  metrics: HoldingMetrics;
  showReturn?: boolean;
}) {
  const asset = metrics.holding.asset;
  const isPositive = metrics.returnPercent >= 0;

  return (
    <div className="flex items-center gap-2.5">
      <AssetIdentityFromAsset asset={asset} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">{asset.name}</p>
        <CategoryBadge size="xs" className="mt-0.5 w-fit" category={asset.category} />
        {showReturn && (
          <p
            className={cn(
              "mt-1 flex items-center gap-0.5 text-[11px] font-bold",
              isPositive ? "text-gain" : "text-loss"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {formatPercent(metrics.returnPercent)}
          </p>
        )}
      </div>
      <p className="text-stat daq-price shrink-0 text-xs font-bold text-foreground">
        {formatDaq(metrics.currentValue)}
      </p>
    </div>
  );
}

function InsightsEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-muted/20 px-4 py-6 text-center">
      <Lightbulb className="mx-auto mb-2 h-5 w-5 text-muted" />
      <p className="text-sm font-semibold text-foreground">No portfolio insights yet</p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted">
        Buy your first asset to start tracking performance.
      </p>
      <Link href="/market" className="mt-4 inline-block">
        <Button size="sm">Explore Market</Button>
      </Link>
    </div>
  );
}

function SingleHoldingInsights({
  metrics,
  allocation,
}: {
  metrics: HoldingMetrics;
  allocation: CategoryAllocation[];
}) {
  const asset = metrics.holding.asset;
  const heldCategories = allocation.map((a) => a.category);
  const suggestedCategories = getUnheldCategories(heldCategories, 3);
  const categoryLabel = CATEGORY_LABELS[asset.category];
  const diversifyHint =
    suggestedCategories.length > 0
      ? suggestedCategories.map((c) => CATEGORY_LABELS[c]).join(", ")
      : "other categories";

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <InsightTile
        label="Current Holding"
        icon={<Target className="h-3.5 w-3.5" />}
        href={`/asset/${asset.slug}`}
      >
        <AssetInsightBody metrics={metrics} />
      </InsightTile>

      <InsightTile
        label="Best Opportunity"
        icon={<Compass className="h-3.5 w-3.5" />}
        href="/market"
      >
        <p className="text-xs leading-relaxed text-foreground-secondary">
          Discover assets in{" "}
          <span className="font-semibold text-foreground">{diversifyHint}</span>{" "}
          to grow your portfolio.
        </p>
        <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-primary">
          Explore Market
          <ArrowRight className="h-3 w-3" />
        </p>
      </InsightTile>

      <InsightTile
        label="Portfolio Concentration"
        icon={<PieChart className="h-3.5 w-3.5" />}
      >
        <p className="text-xs leading-relaxed text-foreground-secondary">
          Your portfolio is currently concentrated in{" "}
          <span className="font-semibold text-foreground">{asset.name}</span>.
        </p>
        <div className="mt-2">
          <CategoryBadge size="xs" category={asset.category} />
        </div>
        <p className="mt-2 text-[11px] text-muted">
          100% of holdings value · {categoryLabel}
        </p>
      </InsightTile>

      <InsightTile
        label="Next Suggested Action"
        icon={<Lightbulb className="h-3.5 w-3.5" />}
        href="/market"
      >
        <p className="text-xs leading-relaxed text-foreground-secondary">
          Explore more categories to diversify your market exposure.
        </p>
        <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-primary">
          Browse categories
          <ArrowRight className="h-3 w-3" />
        </p>
      </InsightTile>
    </div>
  );
}

function MultiHoldingInsights({ metrics }: { metrics: HoldingMetrics[] }) {
  const sorted = [...metrics].sort((a, b) => b.returnPercent - a.returnPercent);
  const best = sorted[0];
  const worst = getLowestReturnHolding(metrics);
  const mostValuable = getMostValuableHolding(metrics);
  const concentration = getHighestConcentration(metrics);

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      {best && (
        <InsightTile
          label="Best Performer"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          href={`/asset/${best.holding.asset.slug}`}
        >
          <AssetInsightBody metrics={best} />
        </InsightTile>
      )}

      {worst && (
        <InsightTile
          label="Worst Performer"
          icon={<TrendingDown className="h-3.5 w-3.5" />}
          href={`/asset/${worst.holding.asset.slug}`}
        >
          <AssetInsightBody metrics={worst} />
        </InsightTile>
      )}

      {mostValuable && (
        <InsightTile
          label="Most Valuable Holding"
          icon={<Layers className="h-3.5 w-3.5" />}
          href={`/asset/${mostValuable.holding.asset.slug}`}
        >
          <AssetInsightBody metrics={mostValuable} showReturn={false} />
        </InsightTile>
      )}

      {concentration && (
        <InsightTile
          label="Highest Concentration"
          icon={<PieChart className="h-3.5 w-3.5" />}
          href={`/asset/${concentration.metrics.holding.asset.slug}`}
        >
          <p className="truncate text-xs font-semibold text-foreground">
            {concentration.metrics.holding.asset.name}
          </p>
          <CategoryBadge
            size="xs"
            className="mt-1 w-fit"
            category={concentration.metrics.holding.asset.category}
          />
          <p className="mt-2 text-xs font-bold text-foreground">
            {concentration.percent.toFixed(0)}% of holdings
          </p>
          <p className="text-stat daq-price mt-0.5 text-[11px] text-muted">
            {formatDaq(concentration.metrics.currentValue)}
          </p>
        </InsightTile>
      )}
    </div>
  );
}

export function PortfolioInsights({ metrics, allocation }: PortfolioInsightsProps) {
  const count = metrics.length;

  return (
    <Card className="!p-4 md:!p-5">
      <CardHeader className="mb-3">
        <CardTitle className="text-sm">Portfolio Insights</CardTitle>
      </CardHeader>

      {count === 0 ? (
        <InsightsEmptyState />
      ) : count === 1 ? (
        <SingleHoldingInsights metrics={metrics[0]} allocation={allocation} />
      ) : (
        <MultiHoldingInsights metrics={metrics} />
      )}
    </Card>
  );
}
