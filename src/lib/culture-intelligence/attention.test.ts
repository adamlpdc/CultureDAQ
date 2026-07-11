import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateMomentumScore,
  calculateViralMultiplier,
  expectedAttentionOnFivePointScale,
  resolveCultureEvent,
} from "./attention";
import type { CultureEvent } from "./types";

const baseEvent: CultureEvent = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Test event",
  description: "Test description", sourceName: "mock", sourceUrl: null, isVerified: true, createdBy: null,
  eventType: "viral_moment",
  affectedAssets: [{ slug: "test", name: "Test" }],
  confidence: 0.9,
  expectedAttention: 60,
  predictedAttention: 75,
  sentiment: "positive",
  reach: 10_000_000,
  timeToPeakHours: 6,
  decayRate: 0.2,
  status: "verified",
  actualAttention: null,
  surpriseDelta: null,
  momentumScore: null,
  viralMultiplier: null,
  resolvedAt: null,
  source: "mock",
  createdAt: "2026-07-11T10:00:00.000Z",
};

test("expected attention is normalised from 0–100 to 1–5", () => {
  assert.equal(expectedAttentionOnFivePointScale(60), 3);
  assert.equal(expectedAttentionOnFivePointScale(0), 1);
  assert.equal(expectedAttentionOnFivePointScale(120), 5);
});

test("resolver calculates positive surprise for an attention beat", () => {
  const result = resolveCultureEvent(baseEvent, 5, new Date("2026-07-11T12:00:00.000Z"));
  assert.equal(result.expectedAttention, 3);
  assert.equal(result.surpriseDelta, 2);
  assert.ok(result.momentumScore > 70);
  assert.ok(result.viralMultiplier > 1);
});

test("negative surprise reduces viral multiplier and momentum", () => {
  const positiveViral = calculateViralMultiplier(2, 0.9, 10_000_000);
  const negativeViral = calculateViralMultiplier(-2, 0.9, 10_000_000);
  const positiveMomentum = calculateMomentumScore(5, 2, positiveViral, 0.9);
  const negativeMomentum = calculateMomentumScore(1, -2, negativeViral, 0.9);
  assert.ok(negativeViral < positiveViral);
  assert.ok(negativeMomentum < positiveMomentum);
});

test("actual attention outside 1–5 is rejected", () => {
  assert.throws(() => resolveCultureEvent(baseEvent, 0), /between 1 and 5/);
  assert.throws(() => resolveCultureEvent(baseEvent, 6), /between 1 and 5/);
});
