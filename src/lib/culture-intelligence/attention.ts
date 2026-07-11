import { normaliseReach } from "@/lib/culture-intelligence/expectation";
import type { CultureEvent } from "@/lib/culture-intelligence/types";

export interface AttentionResolution {
  cultureEventId: string;
  expectedAttention: number;
  actualAttention: number;
  surpriseDelta: number;
  momentumScore: number;
  viralMultiplier: number;
  resolvedAt: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Converts the CultureEvent 0–100 expectation signal to the resolver's 1–5 scale. */
export function expectedAttentionOnFivePointScale(expectedAttention: number): number {
  return clamp(expectedAttention / 20, 1, 5);
}

export function calculateViralMultiplier(
  surpriseDelta: number,
  confidence: number,
  reach: number
): number {
  const reachSignal = normaliseReach(reach);
  const positiveSurprise = Math.max(0, surpriseDelta);
  const disappointment = Math.max(0, -surpriseDelta);
  const multiplier =
    1 + positiveSurprise * 0.32 + reachSignal * 0.28 + confidence * 0.12 - disappointment * 0.22;
  return clamp(multiplier, 0.5, 3);
}

export function calculateMomentumScore(
  actualAttention: number,
  surpriseDelta: number,
  viralMultiplier: number,
  confidence: number
): number {
  const actualSignal = (actualAttention / 5) * 45;
  const surpriseSignal = clamp((surpriseDelta + 4) / 8, 0, 1) * 25;
  const viralSignal = clamp((viralMultiplier - 0.5) / 2.5, 0, 1) * 20;
  const confidenceSignal = confidence * 10;
  return clamp(actualSignal + surpriseSignal + viralSignal + confidenceSignal, 0, 100);
}

export function resolveCultureEvent(
  event: CultureEvent,
  actualAttention: number,
  resolvedAt = new Date()
): AttentionResolution {
  if (actualAttention < 1 || actualAttention > 5) {
    throw new Error("Actual attention must be between 1 and 5");
  }
  const expectedAttention = expectedAttentionOnFivePointScale(event.expectedAttention);
  const surpriseDelta = actualAttention - expectedAttention;
  const viralMultiplier = calculateViralMultiplier(
    surpriseDelta,
    event.confidence,
    event.reach
  );
  const momentumScore = calculateMomentumScore(
    actualAttention,
    surpriseDelta,
    viralMultiplier,
    event.confidence
  );
  return {
    cultureEventId: event.id,
    expectedAttention,
    actualAttention,
    surpriseDelta,
    momentumScore,
    viralMultiplier,
    resolvedAt: resolvedAt.toISOString(),
  };
}

export function withAttentionResolution(
  event: CultureEvent,
  resolution: AttentionResolution
): CultureEvent {
  if (event.id !== resolution.cultureEventId) {
    throw new Error("Attention resolution does not match CultureEvent");
  }
  return {
    ...event,
    actualAttention: resolution.actualAttention,
    surpriseDelta: resolution.surpriseDelta,
    momentumScore: resolution.momentumScore,
    viralMultiplier: resolution.viralMultiplier,
    resolvedAt: resolution.resolvedAt,
    status: "peaked",
  };
}
