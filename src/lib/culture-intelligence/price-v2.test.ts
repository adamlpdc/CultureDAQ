import assert from "node:assert/strict";
import test from "node:test";
import { simulatePriceV2, type PriceV2Input } from "./price-v2";

const input: PriceV2Input = {
  assetSlug: "test",
  assetName: "Test Asset",
  cultureEventId: "11111111-1111-4111-8111-111111111111",
  cultureEventTitle: "Test event",
  oldPrice: 100,
  expectationScore: 60,
  expectedAttention: 60,
  actualAttention: 5,
  surpriseDelta: 2,
  momentumScore: 80,
  viralMultiplier: 1.8,
  simulatedAt: "2026-07-11T12:00:00.000Z",
};

test("positive surprise produces a higher simulated price", () => {
  const result = simulatePriceV2(input);
  assert.ok(result.simulatedPrice > result.oldPrice);
  assert.ok(result.changePercent > 0);
  assert.ok(Math.abs(result.priceImpact - (result.simulatedPrice - result.oldPrice)) < 0.0001);
});

test("disappointment produces a lower simulated price", () => {
  const result = simulatePriceV2({
    ...input,
    actualAttention: 1,
    surpriseDelta: -2,
    momentumScore: 25,
    viralMultiplier: 0.7,
  });
  assert.ok(result.simulatedPrice < result.oldPrice);
  assert.match(result.reason, /missed|Weak|unwinding|Limited/);
});

test("price changes cannot exceed the configured limit", () => {
  const result = simulatePriceV2(
    { ...input, surpriseDelta: 4, momentumScore: 100, viralMultiplier: 3 },
    {
      maxChangePercent: 5,
      minPrice: 0.01,
      surpriseMultiplier: 1.4,
      momentumMultiplier: 2,
      viralMultiplier: 1,
    }
  );
  assert.equal(result.changePercent, 5);
  assert.equal(result.simulatedPrice, 105);
});

test("all required Attention and Expectation inputs affect the lanes", () => {
  const baseline = simulatePriceV2(input);
  const changedExpectation = simulatePriceV2({ ...input, expectationScore: 90 });
  const changedExpectedAttention = simulatePriceV2({ ...input, expectedAttention: 90 });
  const changedActual = simulatePriceV2({ ...input, actualAttention: 4 });
  const changedSurprise = simulatePriceV2({ ...input, surpriseDelta: 1 });
  const changedMomentum = simulatePriceV2({ ...input, momentumScore: 60 });
  const changedViral = simulatePriceV2({ ...input, viralMultiplier: 1.2 });
  for (const result of [
    changedExpectation,
    changedExpectedAttention,
    changedActual,
    changedSurprise,
    changedMomentum,
    changedViral,
  ]) {
    assert.notEqual(result.changePercent, baseline.changePercent);
  }
});

test("invalid live-price and attention inputs are rejected", () => {
  assert.throws(() => simulatePriceV2({ ...input, oldPrice: 0 }), /greater than zero/);
  assert.throws(() => simulatePriceV2({ ...input, actualAttention: 6 }), /between 1 and 5/);
});
