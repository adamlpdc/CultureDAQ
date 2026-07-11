import assert from "node:assert/strict";
import test from "node:test";
import { calculateMarketEngineV2, selectUnconsumedCultureEvent, type MarketEngineV2Input } from "./market-engine-v2";

const base = (overrides: Partial<MarketEngineV2Input> = {}): MarketEngineV2Input => ({
  assetId: "asset-1",
  assetSlug: "test-asset",
  assetName: "Test Asset",
  oldPrice: 10_000,
  price24hAgo: 10_000,
  expectationScore: 50,
  signedMomentum: 0,
  buyPressure: 0,
  sellPressure: 0,
  tradeVolume24h: 0,
  event: null,
  calculatedAt: "2026-07-11T12:00:00.000Z",
  ...overrides,
});

test("no signal produces exactly zero return", () => {
  const result = calculateMarketEngineV2(base());
  assert.equal(result.finalPercentageMove, 0);
  assert.equal(result.newPrice, 10_000);
  assert.equal(result.randomImpactPercent, 0);
});

test("volume cannot create upward movement", () => {
  const result = calculateMarketEngineV2(base({ tradeVolume24h: 1_000_000 }));
  assert.equal(result.finalPercentageMove, 0);
});

test("player pressure is signed and manipulation-capped", () => {
  const buy = calculateMarketEngineV2(base({ buyPressure: 1_000_000 }));
  const sell = calculateMarketEngineV2(base({ sellPressure: 1_000_000 }));
  assert.ok(buy.tradingPressurePercent <= 0.08 && buy.tradingPressurePercent > 0);
  assert.ok(sell.tradingPressurePercent >= -0.08 && sell.tradingPressurePercent < 0);
});

test("normal movement is capped at 0.35 percent", () => {
  const result = calculateMarketEngineV2(base({
    signedMomentum: 100, buyPressure: 1_000_000,
  }));
  assert.ok(Math.abs(result.finalPercentageMove) <= 0.35);
  assert.ok(result.finalPercentageMove > 0);
});

test("verified events can move up to 15 percent", () => {
  const result = calculateMarketEngineV2(base({
    price24hAgo: 10_000,
    event: {
      id: "event-2", title: "Verified signal", verified: true,
      sentiment: "positive", reach: 1_000_000,
      confidence: 1, expectedAttention: 20, actualAttention: 5,
      surpriseDelta: 4, momentumScore: 100, viralMultiplier: 3, decayMultiplier: 1,
    },
  }));
  assert.ok(result.finalPercentageMove > 0.35);
  assert.ok(result.finalPercentageMove <= 15);
});

test("rolling 24-hour movement is capped at five percent", () => {
  const result = calculateMarketEngineV2(base({
    oldPrice: 10_490,
    signedMomentum: 10,
    price24hAgo: 10_000,
  }));
  assert.ok(result.newPrice <= 10_500);
});

test("sub-material signals are audited but not applied", () => {
  const result = calculateMarketEngineV2(base({ signedMomentum: 0.1 }));
  assert.equal(result.material, false);
  assert.equal(result.finalPercentageMove, 0);
});

test("symmetric noise remains centred around zero", () => {
  let total = 0;
  for (let index = 0; index < 500; index++) {
    total += calculateMarketEngineV2(base({
      assetSlug: `asset-${index}`,
      signedMomentum: 1,
    })).randomImpactPercent;
  }
  assert.ok(Math.abs(total / 500) < 0.001);
});

test("signed momentum mean-reverts", () => {
  const positive = calculateMarketEngineV2(base({ signedMomentum: 2 }));
  const negative = calculateMarketEngineV2(base({ signedMomentum: -2 }));
  assert.ok(positive.nextSignedMomentum > 0 && positive.nextSignedMomentum < 2);
  assert.ok(negative.nextSignedMomentum < 0 && negative.nextSignedMomentum > -2);
});

test("every applied movement has short and detailed Why It Moved output", () => {
  const result = calculateMarketEngineV2(base({ signedMomentum: 3 }));
  assert.equal(result.material, true);
  assert.match(result.reason, /Test Asset/);
  assert.match(result.detailedExplanation, /Final move/);
});

const verifiedEvent = (overrides: Partial<NonNullable<MarketEngineV2Input["event"]>> = {}): NonNullable<MarketEngineV2Input["event"]> => ({
  id: "culture-event", title: "Culture event", verified: true, sentiment: "positive", reach: 1_000_000,
  confidence: 0.9, expectedAttention: 70, actualAttention: 3.5, surpriseDelta: 0,
  momentumScore: 50, viralMultiplier: 1, decayMultiplier: 1, ...overrides,
});

test("positive and negative sentiment produce signed event impact", () => {
  const positive = calculateMarketEngineV2(base({ event: verifiedEvent({ sentiment: "positive" }) }));
  const negative = calculateMarketEngineV2(base({ event: verifiedEvent({ sentiment: "negative" }) }));
  assert.ok(positive.eventImpactPercent > 0);
  assert.ok(negative.eventImpactPercent < 0);
});

test("neutral events need surprise to move", () => {
  const neutral = calculateMarketEngineV2(base({ event: verifiedEvent({ sentiment: "neutral", surpriseDelta: 0 }) }));
  const surprised = calculateMarketEngineV2(base({ event: verifiedEvent({ sentiment: "neutral", surpriseDelta: -1 }) }));
  assert.equal(neutral.eventImpactPercent, 0);
  assert.ok(surprised.eventImpactPercent < 0);
});

test("low confidence suppresses event impact", () => {
  const high = calculateMarketEngineV2(base({ event: verifiedEvent({ confidence: 1 }) }));
  const low = calculateMarketEngineV2(base({ event: verifiedEvent({ confidence: 0.05 }) }));
  assert.ok(Math.abs(low.eventImpactPercent) < Math.abs(high.eventImpactPercent) / 10);
});

test("unverified events never affect price", () => {
  const result = calculateMarketEngineV2(base({ event: verifiedEvent({ verified: false }) }));
  assert.equal(result.eventImpactPercent, 0);
  assert.equal(result.finalPercentageMove, 0);
});

test("event decay reduces impact over time", () => {
  const fresh = calculateMarketEngineV2(base({ event: verifiedEvent({ decayMultiplier: 1 }) }));
  const old = calculateMarketEngineV2(base({ event: verifiedEvent({ decayMultiplier: 0.1 }) }));
  assert.ok(Math.abs(old.eventImpactPercent) < Math.abs(fresh.eventImpactPercent));
});

test("the same event can calculate independently for multiple affected assets", () => {
  const event = verifiedEvent();
  const first = calculateMarketEngineV2(base({ assetId: "a", assetSlug: "a", event }));
  const second = calculateMarketEngineV2(base({ assetId: "b", assetSlug: "b", event }));
  assert.ok(first.eventImpactPercent > 0 && second.eventImpactPercent > 0);
});

test("duplicate consumption protection skips an event already used for an asset", () => {
  const event = verifiedEvent();
  assert.equal(selectUnconsumedCultureEvent([event], "asset-a", new Set([`asset-a:${event.id}`])), null);
  assert.equal(selectUnconsumedCultureEvent([event], "asset-b", new Set([`asset-a:${event.id}`]))?.id, event.id);
});
