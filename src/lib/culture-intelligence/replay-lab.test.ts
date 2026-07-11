import assert from "node:assert/strict";
import test from "node:test";
import { generateMockCultureEvents } from "./mock-events";
import {
  DEFAULT_REPLAY_BALANCE,
  replayRunToCsv,
  runReplayLab,
  validateReplayBalance,
} from "./replay-lab";

const events = generateMockCultureEvents(new Date("2026-07-11T12:00:00.000Z"));
const assets = [
  { slug: "liverpool-fc", name: "Liverpool FC", livePrice: 200 },
  { slug: "mrbeast", name: "MrBeast", livePrice: 150 },
  { slug: "zendaya", name: "Zendaya", livePrice: 180 },
];

test("batch replay sends every resolved historical event through the full pipeline", () => {
  const run = runReplayLab({
    events,
    assets,
    runAt: new Date("2026-07-12T12:00:00.000Z"),
  });
  assert.equal(run.statistics.eventCount, 3);
  assert.equal(run.statistics.assetSimulationCount, 3);
  for (const simulation of run.simulations) {
    assert.ok(simulation.explanationTrace.length === 7);
    assert.ok(simulation.shortExplanation.length > 0);
  }
});

test("balancing controls change replay output without code changes", () => {
  const baseline = runReplayLab({ events, assets, config: DEFAULT_REPLAY_BALANCE });
  const aggressive = runReplayLab({
    events,
    assets,
    config: {
      surpriseMultiplier: 3,
      momentumMultiplier: 5,
      expectationDecayRate: 2,
      viralMultiplier: 2,
      maximumDailyMovement: 20,
    },
  });
  assert.notDeepEqual(
    aggressive.simulations.map((item) => item.changePercent),
    baseline.simulations.map((item) => item.changePercent)
  );
});

test("maximum daily movement caps every batch result", () => {
  const run = runReplayLab({
    events,
    assets,
    config: { ...DEFAULT_REPLAY_BALANCE, maximumDailyMovement: 2 },
  });
  assert.ok(run.simulations.every((item) => Math.abs(item.changePercent) <= 2));
});

test("run statistics reconcile with simulation results", () => {
  const run = runReplayLab({ events, assets });
  assert.equal(
    run.statistics.positiveCount + run.statistics.negativeCount,
    run.simulations.filter((item) => item.changePercent !== 0).length
  );
  assert.equal(
    run.statistics.totalDivergence,
    Math.round(run.simulations.reduce((sum, item) => sum + Math.abs(item.priceImpact), 0) * 10_000) / 10_000
  );
});

test("CSV export contains one row per simulation and escapes explanations", () => {
  const run = runReplayLab({ events, assets, name: "CSV test" });
  const csv = replayRunToCsv(run);
  assert.equal(csv.split("\n").length, run.simulations.length + 1);
  assert.match(csv, /Run ID,Run Name,Asset/);
  assert.match(csv, /CSV test/);
});

test("invalid balance values are rejected and excessive values are bounded", () => {
  assert.throws(
    () => validateReplayBalance({ ...DEFAULT_REPLAY_BALANCE, viralMultiplier: 0 }),
    /greater than zero/
  );
  assert.equal(
    validateReplayBalance({ ...DEFAULT_REPLAY_BALANCE, maximumDailyMovement: 100 }).maximumDailyMovement,
    25
  );
});
