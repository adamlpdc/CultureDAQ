import type { CultureEvent } from "@/lib/culture-intelligence/types";

export interface ExpectationConfig {
  minScore: number;
  maxScore: number;
  halfLifeHours: number;
  contributionScale: number;
  reachCeiling: number;
}

export const DEFAULT_EXPECTATION_CONFIG: ExpectationConfig = {
  minScore: 0,
  maxScore: 95,
  halfLifeHours: 72,
  contributionScale: 0.28,
  reachCeiling: 100_000_000,
};

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getExpectationConfigFromEnv(): ExpectationConfig {
  return {
    ...DEFAULT_EXPECTATION_CONFIG,
    maxScore: Math.min(
      100,
      positiveNumber(process.env.EXPECTATION_MAX_SCORE, DEFAULT_EXPECTATION_CONFIG.maxScore)
    ),
    halfLifeHours: positiveNumber(
      process.env.EXPECTATION_HALF_LIFE_HOURS,
      DEFAULT_EXPECTATION_CONFIG.halfLifeHours
    ),
  };
}

export interface ExpectationContribution {
  eventId: string;
  eventTitle: string;
  initialImpact: number;
  currentImpact: number;
  confidence: number;
  predictedAttention: number;
  reach: number;
  createdAt: string;
}

export interface AssetExpectation {
  assetSlug: string;
  assetName: string;
  currentExpectation: number;
  previousExpectation: number;
  trend: "rising" | "falling" | "stable";
  decayTimerHours: number;
  contributions: ExpectationContribution[];
  calculatedAt: string;
}

export interface ExpectationHistoryPoint {
  assetSlug: string;
  score: number;
  reason: "event" | "decay" | "recalculation";
  cultureEventId?: string;
  recordedAt: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Normalises reach logarithmically so viral scale cannot dominate the score. */
export function normaliseReach(reach: number, ceiling = DEFAULT_EXPECTATION_CONFIG.reachCeiling): number {
  if (reach <= 0) return 0;
  return clamp(Math.log10(reach + 1) / Math.log10(ceiling + 1), 0, 1);
}

/**
 * Initial event impact: predicted attention (55%), confidence (30%), and
 * logarithmic reach (15%), scaled to a bounded score contribution.
 */
export function calculateEventContribution(
  event: CultureEvent,
  config: ExpectationConfig = DEFAULT_EXPECTATION_CONFIG
): number {
  const signal =
    event.predictedAttention * 0.55 +
    event.confidence * 100 * 0.3 +
    normaliseReach(event.reach, config.reachCeiling) * 100 * 0.15;
  return signal * config.contributionScale;
}

export function decayContribution(
  initialImpact: number,
  ageHours: number,
  halfLifeHours = DEFAULT_EXPECTATION_CONFIG.halfLifeHours
): number {
  if (halfLifeHours <= 0) throw new Error("Expectation half-life must be greater than zero");
  if (ageHours <= 0) return initialImpact;
  return initialImpact * Math.pow(0.5, ageHours / halfLifeHours);
}

function scoreAt(
  contributions: Array<Pick<ExpectationContribution, "initialImpact" | "createdAt">>,
  at: Date,
  config: ExpectationConfig
): number {
  const total = contributions.reduce((sum, contribution) => {
    if (new Date(contribution.createdAt).getTime() > at.getTime()) return sum;
    const ageHours = Math.max(0, (at.getTime() - new Date(contribution.createdAt).getTime()) / 3_600_000);
    return sum + decayContribution(contribution.initialImpact, ageHours, config.halfLifeHours);
  }, 0);
  return clamp(total, config.minScore, config.maxScore);
}

export function calculateAssetExpectations(
  events: CultureEvent[],
  now = new Date(),
  config: ExpectationConfig = DEFAULT_EXPECTATION_CONFIG
): AssetExpectation[] {
  if (config.maxScore < config.minScore) throw new Error("Expectation maximum must not be below minimum");

  const assets = new Map<string, { name: string; events: CultureEvent[] }>();
  for (const event of events) {
    for (const asset of event.affectedAssets) {
      const current = assets.get(asset.slug) ?? { name: asset.name, events: [] };
      current.events.push(event);
      assets.set(asset.slug, current);
    }
  }

  const previousAt = new Date(now.getTime() - 24 * 3_600_000);
  return [...assets.entries()]
    .map(([assetSlug, value]) => {
      const contributions = value.events.map((event): ExpectationContribution => {
        const initialImpact = calculateEventContribution(event, config);
        const ageHours = Math.max(0, (now.getTime() - new Date(event.createdAt).getTime()) / 3_600_000);
        return {
          eventId: event.id,
          eventTitle: event.title,
          initialImpact,
          currentImpact: decayContribution(initialImpact, ageHours, config.halfLifeHours),
          confidence: event.confidence,
          predictedAttention: event.predictedAttention,
          reach: event.reach,
          createdAt: event.createdAt,
        };
      });
      const currentExpectation = scoreAt(contributions, now, config);
      const previousExpectation = scoreAt(contributions, previousAt, config);
      const difference = currentExpectation - previousExpectation;
      const trend: AssetExpectation["trend"] =
        difference > 0.5 ? "rising" : difference < -0.5 ? "falling" : "stable";
      return {
        assetSlug,
        assetName: value.name,
        currentExpectation,
        previousExpectation,
        trend,
        decayTimerHours: config.halfLifeHours,
        contributions: contributions.sort((a, b) => b.currentImpact - a.currentImpact),
        calculatedAt: now.toISOString(),
      };
    })
    .sort((a, b) => b.currentExpectation - a.currentExpectation);
}

export function buildExpectationHistory(
  events: CultureEvent[],
  now = new Date(),
  config: ExpectationConfig = DEFAULT_EXPECTATION_CONFIG
): ExpectationHistoryPoint[] {
  const points: ExpectationHistoryPoint[] = [];
  const seenAssets = new Set(events.flatMap((event) => event.affectedAssets.map((asset) => asset.slug)));
  for (const event of [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const scores = calculateAssetExpectations(
      events.filter((candidate) => candidate.createdAt <= event.createdAt),
      new Date(event.createdAt),
      config
    );
    for (const asset of event.affectedAssets) {
      const score = scores.find((item) => item.assetSlug === asset.slug)?.currentExpectation ?? 0;
      points.push({
        assetSlug: asset.slug,
        score,
        reason: "event",
        cultureEventId: event.id,
        recordedAt: event.createdAt,
      });
    }
  }
  const current = calculateAssetExpectations(events, now, config);
  for (const assetSlug of seenAssets) {
    points.push({
      assetSlug,
      score: current.find((item) => item.assetSlug === assetSlug)?.currentExpectation ?? 0,
      reason: "decay",
      recordedAt: now.toISOString(),
    });
  }
  return points;
}
