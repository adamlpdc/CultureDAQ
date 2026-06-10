import type { AssetCategory, HoldingWithAsset } from "@/types/database";
import { ALL_CATEGORIES, CATEGORY_LABELS, STARTING_DAQ } from "@/lib/constants";

export interface HoldingMetrics {
  holding: HoldingWithAsset;
  currentValue: number;
  costBasis: number;
  profitLoss: number;
  returnPercent: number;
}

export interface CategoryAllocation {
  category: AssetCategory;
  label: string;
  value: number;
  percent: number;
}

export interface PortfolioAnalytics {
  holdingMetrics: HoldingMetrics[];
  totalReturnPercent: number;
  totalReturnDaq: number;
  bestPerformer: HoldingMetrics | null;
  worstPerformer: HoldingMetrics | null;
  allocation: CategoryAllocation[];
}

export function computeHoldingMetrics(holding: HoldingWithAsset): HoldingMetrics {
  const currentValue = holding.shares * holding.asset.current_price;
  const costBasis = holding.shares * holding.avg_cost;
  const profitLoss = currentValue - costBasis;
  const returnPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

  return {
    holding,
    currentValue,
    costBasis,
    profitLoss,
    returnPercent,
  };
}

export function computePortfolioAnalytics(
  holdings: HoldingWithAsset[],
  totalValue: number
): PortfolioAnalytics {
  const holdingMetrics = holdings.map(computeHoldingMetrics);
  const sorted = [...holdingMetrics].sort((a, b) => b.returnPercent - a.returnPercent);

  const totalReturnDaq = totalValue - STARTING_DAQ;
  const totalReturnPercent =
    STARTING_DAQ > 0 ? (totalReturnDaq / STARTING_DAQ) * 100 : 0;

  const categoryTotals = new Map<AssetCategory, number>();
  for (const m of holdingMetrics) {
    const cat = m.holding.asset.category;
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + m.currentValue);
  }

  const holdingsValue = holdingMetrics.reduce((s, m) => s + m.currentValue, 0);
  const allocation: CategoryAllocation[] = [...categoryTotals.entries()]
    .map(([category, value]) => ({
      category,
      label: CATEGORY_LABELS[category],
      value,
      percent: holdingsValue > 0 ? (value / holdingsValue) * 100 : 0,
    }))
    .sort((a, b) => b.percent - a.percent);

  return {
    holdingMetrics,
    totalReturnPercent,
    totalReturnDaq,
    bestPerformer: sorted[0] ?? null,
    worstPerformer: sorted[sorted.length - 1] ?? null,
    allocation,
  };
}

export function getTopPerformers(
  metrics: HoldingMetrics[],
  limit = 3
): HoldingMetrics[] {
  return [...metrics]
    .filter((m) => m.returnPercent > 0)
    .sort((a, b) => b.returnPercent - a.returnPercent)
    .slice(0, limit);
}

export function getWorstPerformers(
  metrics: HoldingMetrics[],
  limit = 3
): HoldingMetrics[] {
  return [...metrics]
    .filter((m) => m.returnPercent < 0)
    .sort((a, b) => a.returnPercent - b.returnPercent)
    .slice(0, limit);
}

export function getMostValuableHolding(
  metrics: HoldingMetrics[]
): HoldingMetrics | null {
  if (metrics.length === 0) return null;
  return [...metrics].sort((a, b) => b.currentValue - a.currentValue)[0];
}

export function getHighestConcentration(metrics: HoldingMetrics[]): {
  metrics: HoldingMetrics;
  percent: number;
} | null {
  if (metrics.length === 0) return null;
  const total = metrics.reduce((s, m) => s + m.currentValue, 0);
  if (total <= 0) return null;
  const top = [...metrics].sort((a, b) => b.currentValue - a.currentValue)[0];
  return { metrics: top, percent: (top.currentValue / total) * 100 };
}

export function getLowestReturnHolding(
  metrics: HoldingMetrics[]
): HoldingMetrics | null {
  if (metrics.length === 0) return null;
  return [...metrics].sort((a, b) => a.returnPercent - b.returnPercent)[0];
}

export function getUnheldCategories(
  held: AssetCategory[],
  limit = 3
): AssetCategory[] {
  return ALL_CATEGORIES.filter((c) => !held.includes(c)).slice(0, limit);
}
