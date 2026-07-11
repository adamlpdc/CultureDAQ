import assert from "node:assert/strict";
import test from "node:test";
import { calculateMomentumUpdate, calculateNewPrice } from "./price-engine";
import type { Asset } from "@/types/database";

function asset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "test-asset",
    name: "Test Asset",
    category: "brands",
    description: null,
    image_url: null,
    current_price: 10_000,
    previous_price: 10_000,
    buy_pressure: 0,
    sell_pressure: 0,
    momentum_score: 0,
    volatility_score: 1,
    category_weight: 1,
    featured: false,
    trading_paused: false,
    trade_volume_24h: 0,
    total_shares_outstanding: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("volume never creates positive movement without a signed signal", () => {
  const timestamp = new Date("2026-07-11T12:00:00.000Z");
  const quiet = calculateNewPrice(asset({ volatility_score: 0, category_weight: 0 }), timestamp);
  const active = calculateNewPrice(
    asset({ volatility_score: 0, category_weight: 0, trade_volume_24h: 100_000 }),
    timestamp
  );
  assert.equal(quiet.changePercent, 0);
  assert.equal(active.changePercent, 0);
});

test("unsigned market noise remains centred around zero over many ticks", () => {
  let total = 0;
  const samples = 5_000;
  for (let index = 0; index < samples; index++) {
    const timestamp = new Date(Date.UTC(2026, 0, 1, 0, index));
    total += calculateNewPrice(asset(), timestamp).changePercent;
  }
  assert.ok(Math.abs(total / samples) < 0.01);
});

test("normal movement is capped to approximately 0.35 percent per tick", () => {
  const result = calculateNewPrice(
    asset({ buy_pressure: 1_000_000, volatility_score: 2, momentum_score: 10 }),
    new Date("2026-07-11T12:00:00.000Z")
  );
  assert.ok(Math.abs(result.changePercent) <= 0.35);
});

test("rolling daily cap prevents movement farther beyond five percent", () => {
  const result = calculateNewPrice(
    asset({ current_price: 10_600, buy_pressure: 1_000_000, momentum_score: 10 }),
    new Date("2026-07-11T12:00:00.000Z"),
    { price24hAgo: 10_000 }
  );
  assert.ok(result.changePercent <= 0);
});

test("verified CultureEvents can exceed the normal cap but remain bounded", () => {
  const result = calculateNewPrice(asset(), new Date("2026-07-11T12:00:00.000Z"), {
    verifiedEventImpactPercent: 8,
  });
  assert.ok(result.changePercent > 0.35);
  assert.ok(result.changePercent <= 15);
});

test("momentum remains signed and mean-reverts without a new impulse", () => {
  const positive = calculateMomentumUpdate(asset({ momentum_score: 8 }), 0);
  const negative = calculateMomentumUpdate(asset({ momentum_score: -8 }), 0);
  assert.ok(positive > 0 && positive < 8);
  assert.ok(negative < 0 && negative > -8);
});
