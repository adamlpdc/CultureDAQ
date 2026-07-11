import { seededRandom } from "@/lib/attention/engine";
import type { EventOutcome, SimulatedAsset } from "@/lib/attention/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Price move per point of positive surprise (actual − expected on 1–5 scale). */
export const SURPRISE_IMPULSE_PER_POINT = 2.15;
export const NEGATIVE_SURPRISE_IMPULSE_PER_POINT = 1.15;
export const MISS_HANGOVER_PCT = -0.2;
export const MEETS_EXPECTATION_THRESHOLD = 0.85;
export const MEETS_EXPECTATION_COOLING_PCT = -0.12;
export const ANTICIPATION_PRICE_IN_FACTOR = 0.27;
export const SANDBOX_FAIR_VALUE_K = 0.19;
export const SANDBOX_REVERSION_RATE = 0.085;
export const MISS_ANTICIPATION_UNWIND_FACTOR = 0.35;
export const MEET_ANTICIPATION_UNWIND_FACTOR = 0.12;
export const HIGH_EXPECTATION_MEET_UNWIND_FACTOR = 0.2;
export const HIGH_EXPECTATION_SCORE_THRESHOLD = 65;

export type OutcomeVerdict = "beat" | "meet" | "miss";

export function getOutcomeVerdict(surpriseDelta: number): OutcomeVerdict {
  if (surpriseDelta > MEETS_EXPECTATION_THRESHOLD) return "beat";
  if (surpriseDelta < -MEETS_EXPECTATION_THRESHOLD) return "miss";
  return "meet";
}

export function rollActualImpact(
  expectedImpact: number,
  expectationScore: number,
  seed: string
): number {
  const rng = seededRandom(seed);
  // High expectation_score → market already priced a beat → more disappointment risk
  const hypeBias = ((expectationScore - 50) / 50) * 0.9;
  const highExpectation =
    expectationScore > 55
      ? 1 + ((expectationScore - 55) / 45) * 0.5
      : 1;
  const noise = (rng - 0.5) * 3.0 * highExpectation;
  const raw = expectedImpact + noise - hypeBias;
  return clamp(Math.round(raw * 2) / 2, 0.5, 5);
}

export function calcSurpriseDelta(expectedImpact: number, actualImpact: number): number {
  return Math.round((actualImpact - expectedImpact) * 100) / 100;
}

export function surpriseToPriceImpulse(surpriseDelta: number): number {
  if (Math.abs(surpriseDelta) < MEETS_EXPECTATION_THRESHOLD) {
    return MEETS_EXPECTATION_COOLING_PCT;
  }
  if (surpriseDelta < 0) {
    return surpriseDelta * NEGATIVE_SURPRISE_IMPULSE_PER_POINT + MISS_HANGOVER_PCT;
  }
  return surpriseDelta * SURPRISE_IMPULSE_PER_POINT;
}

export function surpriseToAttentionDelta(surpriseDelta: number): number {
  if (Math.abs(surpriseDelta) < MEETS_EXPECTATION_THRESHOLD) return -3;
  if (surpriseDelta < 0) {
    return surpriseDelta * 7 - 4;
  }
  return surpriseDelta * 5;
}

export function estimateAnticipationPricedIn(
  asset: SimulatedAsset,
  expectedImpact: number
): number {
  const hypePremium = 1 + (asset.expectationScore - 50) / 180;
  return (
    expectedImpact *
    ANTICIPATION_PRICE_IN_FACTOR *
    hypePremium *
    asset.volatility *
    3.1
  );
}

export function calcAnticipationPriceDrift(
  asset: SimulatedAsset,
  simTime: string
): number {
  const now = new Date(simTime).getTime();
  let drift = 0;

  for (const catalyst of asset.catalysts) {
    const hoursUntil =
      (new Date(catalyst.scheduledAt).getTime() - now) / (60 * 60 * 1000);
    if (hoursUntil <= 0 || hoursUntil > 72) continue;

    const proximity = 1 - (hoursUntil / 72) ** 2;
    const hypePremium = 1 + (asset.expectationScore - 50) / 200;
    drift +=
      catalyst.expectedImpact *
      proximity *
      ANTICIPATION_PRICE_IN_FACTOR *
      hypePremium *
      asset.volatility *
      0.04;
  }

  return drift;
}

export function buildOutcome(params: {
  title: string;
  source: string;
  eventKind: string;
  occurredAt: string;
  expectedImpact: number;
  actualImpact: number;
  expectationScore: number;
}): EventOutcome {
  const surpriseDelta = calcSurpriseDelta(params.expectedImpact, params.actualImpact);
  const verdict = getOutcomeVerdict(surpriseDelta);
  const priceImpulse = surpriseToPriceImpulse(surpriseDelta);

  let headline: string;
  if (verdict === "beat") {
    headline = `Beat expectations (${params.actualImpact} vs ${params.expectedImpact} expected)`;
  } else if (verdict === "miss") {
    headline = `Missed expectations (${params.actualImpact} vs ${params.expectedImpact} expected)`;
  } else {
    headline = `Met expectations (${params.actualImpact} vs ${params.expectedImpact} expected)`;
  }

  return {
    title: params.title,
    source: params.source,
    eventKind: params.eventKind,
    occurredAt: params.occurredAt,
    expectationScore: params.expectationScore,
    expectedImpact: params.expectedImpact,
    actualImpact: params.actualImpact,
    surpriseDelta,
    verdict,
    priceImpulsePercent: priceImpulse,
    headline,
  };
}
