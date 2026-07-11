export interface RebalanceAssetInput {
  id: string;
  slug: string;
  name: string;
  currentPrice: number;
  previousPrice: number;
  totalSharesOutstanding: number;
}

export interface RebalanceAssetPlan extends RebalanceAssetInput {
  oldRank: number;
  newRank: number;
  newPrice: number;
  newPreviousPrice: number;
  priceFactor: number;
  newTotalSharesOutstanding: number;
  oldMarketValue: number;
  newMarketValue: number;
  valueDrift: number;
  tier: "smaller" | "mid" | "major" | "premier";
}

export interface RebalancePlan {
  assets: RebalanceAssetPlan[];
  rankingsPreserved: boolean;
  maximumValueDrift: number;
  oldMinPrice: number;
  oldMaxPrice: number;
  newMinPrice: number;
  newMaxPrice: number;
  createdAt: string;
}

const round = (value: number, places: number) => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};

function geometricInterpolate(min: number, max: number, position: number): number {
  if (position <= 0) return min;
  if (position >= 1) return max;
  return min * Math.pow(max / min, position);
}

/**
 * Piecewise geometric rank mapping:
 * bottom 50%: 1K–5K, next 15%: 5K–10K,
 * next 20%: 10K–25K, top 15%: 25K–50K.
 * It is strictly monotonic, so all non-tied asset ranks are preserved.
 */
export function targetPriceForPercentile(percentile: number): {
  price: number;
  tier: RebalanceAssetPlan["tier"];
} {
  const p = Math.min(1, Math.max(0, percentile));
  if (p === 1) return { price: 50_000, tier: "premier" };
  if (p === 0.85) return { price: 25_000, tier: "major" };
  if (p === 0.65) return { price: 10_000, tier: "mid" };
  if (p === 0.5) return { price: 5_000, tier: "smaller" };
  if (p <= 0.5) {
    return { price: geometricInterpolate(1_000, 5_000, p / 0.5), tier: "smaller" };
  }
  if (p <= 0.65) {
    return { price: geometricInterpolate(5_000, 10_000, (p - 0.5) / 0.15), tier: "mid" };
  }
  if (p <= 0.85) {
    return { price: geometricInterpolate(10_000, 25_000, (p - 0.65) / 0.2), tier: "major" };
  }
  return { price: geometricInterpolate(25_000, 50_000, (p - 0.85) / 0.15), tier: "premier" };
}

export function buildMarketRebalancePlan(
  assets: RebalanceAssetInput[],
  createdAt = new Date()
): RebalancePlan {
  if (assets.length === 0) throw new Error("Cannot rebalance an empty market");
  for (const asset of assets) {
    if (asset.currentPrice <= 0 || asset.previousPrice <= 0) {
      throw new Error(`Asset ${asset.slug} has a non-positive price`);
    }
  }

  const ascending = [...assets].sort(
    (a, b) => a.currentPrice - b.currentPrice || a.id.localeCompare(b.id)
  );
  const oldDescending = [...ascending].reverse();
  const oldRank = new Map(oldDescending.map((asset, index) => [asset.id, index + 1]));
  const denominator = Math.max(1, ascending.length - 1);

  const planned = ascending.map((asset, index): RebalanceAssetPlan => {
    const target = targetPriceForPercentile(index / denominator);
    const newPrice = round(target.price, 4);
    const priceFactor = newPrice / asset.currentPrice;
    const newTotalSharesOutstanding = round(asset.totalSharesOutstanding / priceFactor, 16);
    const oldMarketValue = asset.currentPrice * asset.totalSharesOutstanding;
    const newMarketValue = newPrice * newTotalSharesOutstanding;
    return {
      ...asset,
      oldRank: oldRank.get(asset.id)!,
      newRank: 0,
      newPrice,
      newPreviousPrice: round(asset.previousPrice * priceFactor, 4),
      priceFactor,
      newTotalSharesOutstanding,
      oldMarketValue,
      newMarketValue,
      valueDrift: newMarketValue - oldMarketValue,
      tier: target.tier,
    };
  });
  const newDescending = [...planned].sort(
    (a, b) => b.newPrice - a.newPrice || b.id.localeCompare(a.id)
  );
  newDescending.forEach((asset, index) => { asset.newRank = index + 1; });
  const rankingsPreserved = planned.every((asset) => asset.oldRank === asset.newRank);

  return {
    assets: [...planned].sort((a, b) => a.oldRank - b.oldRank),
    rankingsPreserved,
    maximumValueDrift: Math.max(...planned.map((asset) => Math.abs(asset.valueDrift))),
    oldMinPrice: Math.min(...assets.map((asset) => asset.currentPrice)),
    oldMaxPrice: Math.max(...assets.map((asset) => asset.currentPrice)),
    newMinPrice: Math.min(...planned.map((asset) => asset.newPrice)),
    newMaxPrice: Math.max(...planned.map((asset) => asset.newPrice)),
    createdAt: createdAt.toISOString(),
  };
}

export function adjustedHolding(params: {
  shares: number;
  averageCost: number;
  oldPrice: number;
  newPrice: number;
}) {
  const factor = params.newPrice / params.oldPrice;
  const newShares = params.shares / factor;
  const newAverageCost = params.averageCost * factor;
  return {
    newShares,
    newAverageCost,
    oldCurrentValue: params.shares * params.oldPrice,
    newCurrentValue: newShares * params.newPrice,
    oldCostBasis: params.shares * params.averageCost,
    newCostBasis: newShares * newAverageCost,
  };
}
