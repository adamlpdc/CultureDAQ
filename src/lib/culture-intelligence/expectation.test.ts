import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAssetExpectations,
  calculateEventContribution,
  decayContribution,
  DEFAULT_EXPECTATION_CONFIG,
  normaliseReach,
} from "./expectation";
import type { CultureEvent } from "./types";

function event(overrides: Partial<CultureEvent> = {}): CultureEvent {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Test event",
    description: "Test description", sourceName: "mock", sourceUrl: null, isVerified: true, createdBy: null,
    eventType: "announcement",
    affectedAssets: [{ slug: "test-asset", name: "Test Asset" }],
    confidence: 0.8,
    expectedAttention: 60,
    predictedAttention: 75,
    sentiment: "positive",
    reach: 1_000_000,
    timeToPeakHours: 8,
    decayRate: 0.2,
    status: "verified",
    actualAttention: null,
    surpriseDelta: null,
    momentumScore: null,
    viralMultiplier: null,
    resolvedAt: null,
    source: "mock",
    createdAt: "2026-07-10T12:00:00.000Z",
    ...overrides,
  };
}

test("reach is logarithmically normalised and bounded", () => {
  assert.equal(normaliseReach(0), 0);
  assert.ok(normaliseReach(1_000_000) > 0.5);
  assert.equal(normaliseReach(1_000_000_000), 1);
});

test("higher confidence, reach and predicted attention increase contribution", () => {
  const low = calculateEventContribution(event({ confidence: 0.2, reach: 100, predictedAttention: 20 }));
  const high = calculateEventContribution(event({ confidence: 0.95, reach: 50_000_000, predictedAttention: 90 }));
  assert.ok(high > low);
});

test("a contribution halves after one configured half-life", () => {
  assert.equal(decayContribution(40, DEFAULT_EXPECTATION_CONFIG.halfLifeHours), 20);
});

test("aggregate expectation never exceeds the configured maximum", () => {
  const events = Array.from({ length: 20 }, (_, index) =>
    event({ id: `${String(index).padStart(8, "0")}-1111-4111-8111-111111111111` })
  );
  const result = calculateAssetExpectations(events, new Date("2026-07-10T12:00:00.000Z"), {
    ...DEFAULT_EXPECTATION_CONFIG,
    maxScore: 80,
  });
  assert.equal(result[0].currentExpectation, 80);
});

test("new events produce a rising trend while old events naturally fall", () => {
  const now = new Date("2026-07-11T12:00:00.000Z");
  const rising = calculateAssetExpectations(
    [event({ createdAt: "2026-07-11T10:00:00.000Z" })],
    now
  );
  const falling = calculateAssetExpectations(
    [event({ createdAt: "2026-07-01T12:00:00.000Z" })],
    now
  );
  assert.equal(rising[0].trend, "rising");
  assert.equal(falling[0].trend, "falling");
});
