import { resolveCultureEvent } from "@/lib/culture-intelligence/attention";
import {
  calculateAssetExpectations,
  DEFAULT_EXPECTATION_CONFIG,
} from "@/lib/culture-intelligence/expectation";
import {
  DEFAULT_PRICE_V2_CONFIG,
  simulatePriceV2,
  type MarketSimulation,
} from "@/lib/culture-intelligence/price-v2";
import type { CultureEvent } from "@/lib/culture-intelligence/types";

export interface ReplayBalanceConfig {
  surpriseMultiplier: number;
  momentumMultiplier: number;
  expectationDecayRate: number;
  viralMultiplier: number;
  maximumDailyMovement: number;
}

export const DEFAULT_REPLAY_BALANCE: ReplayBalanceConfig = {
  surpriseMultiplier: 1.4,
  momentumMultiplier: 2,
  expectationDecayRate: 1,
  viralMultiplier: 1,
  maximumDailyMovement: 12,
};

export interface ReplayAsset {
  slug: string;
  name: string;
  livePrice: number;
}

export interface ReplayRunStatistics {
  eventCount: number;
  assetSimulationCount: number;
  averageChangePercent: number;
  averageAbsoluteChangePercent: number;
  positiveCount: number;
  negativeCount: number;
  cappedCount: number;
  totalDivergence: number;
}

export interface ReplayRun {
  id: string;
  name: string;
  config: ReplayBalanceConfig;
  simulations: MarketSimulation[];
  statistics: ReplayRunStatistics;
  createdAt: string;
}

const round = (value: number, places = 2) => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};

export function validateReplayBalance(config: ReplayBalanceConfig): ReplayBalanceConfig {
  const entries = Object.entries(config);
  for (const [key, value] of entries) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${key} must be greater than zero`);
  }
  return {
    surpriseMultiplier: Math.min(config.surpriseMultiplier, 5),
    momentumMultiplier: Math.min(config.momentumMultiplier, 8),
    expectationDecayRate: Math.min(config.expectationDecayRate, 5),
    viralMultiplier: Math.min(config.viralMultiplier, 4),
    maximumDailyMovement: Math.min(config.maximumDailyMovement, 25),
  };
}

export function runReplayLab(params: {
  events: CultureEvent[];
  assets: ReplayAsset[];
  config?: ReplayBalanceConfig;
  name?: string;
  runAt?: Date;
}): ReplayRun {
  const config = validateReplayBalance(params.config ?? DEFAULT_REPLAY_BALANCE);
  const runAt = params.runAt ?? new Date();
  const resolvedEvents = params.events.filter(
    (event) => event.actualAttention != null && event.resolvedAt != null
  );
  const simulations: MarketSimulation[] = [];

  for (const event of resolvedEvents) {
    const replayAt = new Date(event.resolvedAt!);
    const historicalEvents = params.events.filter(
      (candidate) => new Date(candidate.createdAt).getTime() <= replayAt.getTime()
    );
    const expectations = calculateAssetExpectations(historicalEvents, replayAt, {
      ...DEFAULT_EXPECTATION_CONFIG,
      halfLifeHours: DEFAULT_EXPECTATION_CONFIG.halfLifeHours / config.expectationDecayRate,
    });
    const resolution = resolveCultureEvent(event, event.actualAttention!, replayAt);

    for (const affected of event.affectedAssets) {
      const asset = params.assets.find((item) => item.slug === affected.slug);
      if (!asset) continue;
      const expectation = expectations.find((item) => item.assetSlug === asset.slug);
      simulations.push(
        simulatePriceV2(
          {
            assetSlug: asset.slug,
            assetName: asset.name,
            cultureEventId: event.id,
            cultureEventTitle: event.title,
            oldPrice: asset.livePrice,
            expectationScore: expectation?.currentExpectation ?? 0,
            expectedAttention: event.expectedAttention,
            actualAttention: resolution.actualAttention,
            surpriseDelta: resolution.surpriseDelta,
            momentumScore: resolution.momentumScore,
            viralMultiplier: resolution.viralMultiplier,
            simulatedAt: replayAt.toISOString(),
          },
          {
            ...DEFAULT_PRICE_V2_CONFIG,
            maxChangePercent: config.maximumDailyMovement,
            surpriseMultiplier: config.surpriseMultiplier,
            momentumMultiplier: config.momentumMultiplier,
            viralMultiplier: config.viralMultiplier,
          }
        )
      );
    }
  }

  const changes = simulations.map((item) => item.changePercent);
  const totalDivergence = simulations.reduce((sum, item) => sum + Math.abs(item.priceImpact), 0);
  const statistics: ReplayRunStatistics = {
    eventCount: resolvedEvents.length,
    assetSimulationCount: simulations.length,
    averageChangePercent: round(changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : 0),
    averageAbsoluteChangePercent: round(changes.length ? changes.reduce((a, b) => a + Math.abs(b), 0) / changes.length : 0),
    positiveCount: changes.filter((value) => value > 0).length,
    negativeCount: changes.filter((value) => value < 0).length,
    cappedCount: changes.filter((value) => Math.abs(value) >= config.maximumDailyMovement).length,
    totalDivergence: round(totalDivergence, 4),
  };

  return {
    id: `replay-${runAt.getTime()}`,
    name: params.name?.trim() || `Replay ${runAt.toISOString()}`,
    config,
    simulations,
    statistics,
    createdAt: runAt.toISOString(),
  };
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function replayRunToCsv(run: ReplayRun): string {
  const headers = [
    "Run ID", "Run Name", "Asset", "Live Price", "Simulated Price", "Difference",
    "Change Percent", "CultureEvent", "Reason", "Short Explanation", "Timestamp",
  ];
  const rows = run.simulations.map((simulation) => [
    run.id,
    run.name,
    simulation.assetName,
    simulation.oldPrice,
    simulation.simulatedPrice,
    simulation.priceImpact,
    simulation.changePercent,
    simulation.cultureEventTitle,
    simulation.reason,
    simulation.shortExplanation,
    simulation.simulatedAt,
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
