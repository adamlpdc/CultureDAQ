import assert from "node:assert/strict";
import test from "node:test";
import {
  adjustedHolding,
  buildMarketRebalancePlan,
  targetPriceForPercentile,
  type RebalanceAssetInput,
} from "./market-rebalance";

const assets: RebalanceAssetInput[] = Array.from({ length: 20 }, (_, index) => ({
  id: String(index).padStart(3, "0"),
  slug: `asset-${index}`,
  name: `Asset ${index}`,
  currentPrice: 1_000_000 * Math.pow(2.1, index),
  previousPrice: 950_000 * Math.pow(2.1, index),
  totalSharesOutstanding: 10_000 + index * 100,
}));

test("target tiers stay within the requested believable ranges", () => {
  assert.deepEqual(targetPriceForPercentile(0), { price: 1_000, tier: "smaller" });
  assert.equal(targetPriceForPercentile(0.5).price, 5_000);
  assert.equal(targetPriceForPercentile(0.65).price, 10_000);
  assert.deepEqual(targetPriceForPercentile(0.85), { price: 25_000, tier: "major" });
  assert.deepEqual(targetPriceForPercentile(1), { price: 50_000, tier: "premier" });
});

test("the monotonic transform preserves every asset rank", () => {
  const plan = buildMarketRebalancePlan(assets, new Date("2026-07-11T12:00:00.000Z"));
  assert.equal(plan.rankingsPreserved, true);
  assert.ok(plan.assets.every((asset) => asset.oldRank === asset.newRank));
  assert.equal(plan.newMinPrice, 1_000);
  assert.equal(plan.newMaxPrice, 50_000);
});

test("inverse share adjustment preserves holding value and cost basis", () => {
  const result = adjustedHolding({
    shares: 17,
    averageCost: 80,
    oldPrice: 250,
    newPrice: 2_500_000,
  });
  assert.ok(Math.abs(result.oldCurrentValue - result.newCurrentValue) < 1e-9);
  assert.ok(Math.abs(result.oldCostBasis - result.newCostBasis) < 1e-9);
});

test("previous price scales by the same factor and preserves percentage movement", () => {
  const plan = buildMarketRebalancePlan(assets);
  for (const asset of plan.assets) {
    const oldChange = (asset.currentPrice - asset.previousPrice) / asset.previousPrice;
    const newChange = (asset.newPrice - asset.newPreviousPrice) / asset.newPreviousPrice;
    assert.ok(Math.abs(oldChange - newChange) < 0.000001);
  }
});

test("market value drift remains limited to numeric rounding", () => {
  const plan = buildMarketRebalancePlan(assets);
  for (const asset of plan.assets) {
    const relativeDrift = asset.oldMarketValue === 0 ? 0 : Math.abs(asset.valueDrift / asset.oldMarketValue);
    assert.ok(relativeDrift < 0.000001);
  }
});

test("empty markets and invalid prices are rejected", () => {
  assert.throws(() => buildMarketRebalancePlan([]), /empty market/);
  assert.throws(
    () => buildMarketRebalancePlan([{ ...assets[0], currentPrice: 0 }]),
    /non-positive price/
  );
});
