import { calculateMarketEngineV2, type MarketEngineV2EventSignal } from "../src/lib/market-engine-v2";

const assets = Array.from({ length: 84 }, (_, index) => ({
  id: `asset-${index}`, slug: `asset-${index}`, price: 10_000, momentum: 0,
}));
const start = new Date("2026-07-01T00:00:00.000Z");
let maximumMove = 0;
const dailyMedian: number[] = [];

for (let day = 0; day < 7; day++) {
  const dayMoves: number[] = [];
  for (let tick = 0; tick < 96; tick++) {
    const at = new Date(start.getTime() + (day * 96 + tick) * 15 * 60 * 1000).toISOString();
    for (let index = 0; index < assets.length; index++) {
      const asset = assets[index];
      let event: MarketEngineV2EventSignal | null = null;
      if (tick === 0) {
        const group = index % 4;
        event = {
          id: `event-${day}-${index}`, title: `Mixed event ${day}-${index}`, verified: true,
          sentiment: group === 0 ? "positive" : group === 1 ? "negative" : "neutral",
          reach: group === 3 ? 500 : 2_000_000, confidence: group === 3 ? 0.05 : 0.85,
          expectedAttention: 65, actualAttention: group === 2 ? 2.25 : 3.25,
          surpriseDelta: group === 2 ? -1 : 0, momentumScore: 50,
          viralMultiplier: 1, decayMultiplier: Math.exp(-day * 0.1),
        };
      }
      const result = calculateMarketEngineV2({
        assetId: asset.id, assetSlug: asset.slug, assetName: asset.slug,
        oldPrice: asset.price, price24hAgo: 10_000, expectationScore: 50,
        signedMomentum: asset.momentum, buyPressure: 0, sellPressure: 0,
        tradeVolume24h: 0, event, calculatedAt: at,
      });
      asset.price = result.newPrice;
      asset.momentum = result.nextSignedMomentum;
      maximumMove = Math.max(maximumMove, Math.abs(result.finalPercentageMove));
      dayMoves.push(result.finalPercentageMove);
    }
  }
  const sorted = dayMoves.sort((a, b) => a - b);
  dailyMedian.push((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2);
}

const averageDailyMedian = dailyMedian.reduce((sum, value) => sum + value, 0) / 7;
const averageReturn = assets.reduce((sum, asset) => sum + (asset.price / 10_000 - 1) * 100, 0) / assets.length;
const report = {
  days: 7, assets: assets.length, ticks: 7 * 96, maximumAbsoluteTickMove: maximumMove,
  averageDailyMedian, averageAssetReturn: averageReturn,
  capsPassed: maximumMove <= 15, driftPassed: Math.abs(averageDailyMedian) <= 0.15,
};
console.log(JSON.stringify(report, null, 2));
if (!report.capsPassed || !report.driftPassed) process.exit(1);
