import {
  MARKET_DRIFT_WARNING_PERCENT_PER_DAY,
  MAX_PRICE_CHANGE_PERCENT,
  MAX_ROLLING_24H_CHANGE_PERCENT,
  MIN_ASSET_PRICE,
  PRICE_MATERIALITY_PERCENT,
  VERIFIED_EVENT_MAX_PRICE_CHANGE_PERCENT,
} from "@/lib/constants";
import { generateActiveMarketMovementExplanation } from "@/lib/culture-intelligence/why-it-moved-v2";

export interface MarketEngineV2EventSignal {
  id: string;
  title: string;
  verified: boolean;
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  reach: number;
  confidence: number;
  expectedAttention: number;
  actualAttention: number;
  surpriseDelta: number;
  momentumScore: number;
  viralMultiplier: number;
  decayMultiplier: number;
}

export interface MarketEngineV2Input {
  assetId: string;
  assetSlug: string;
  assetName: string;
  oldPrice: number;
  price24hAgo?: number | null;
  expectationScore: number;
  signedMomentum: number;
  buyPressure: number;
  sellPressure: number;
  tradeVolume24h: number;
  event: MarketEngineV2EventSignal | null;
  calculatedAt: string;
}

export interface AppliedCap {
  key: "normal_tick" | "verified_event" | "rolling_24h" | "materiality";
  limitPercent: number;
  applied: boolean;
}

export interface MarketEngineV2Result {
  newPrice: number;
  expectedAttention: number | null;
  actualAttention: number | null;
  surpriseDelta: number;
  nextSignedMomentum: number;
  tradingPressurePercent: number;
  eventImpactPercent: number;
  momentumImpactPercent: number;
  randomImpactPercent: number;
  finalPercentageMove: number;
  appliedCaps: AppliedCap[];
  material: boolean;
  reason: string;
  detailedExplanation: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round = (value: number, places = 4) => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};

function symmetricNoise(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 0xffffffff) * 2 - 1;
}

/** Production Market Engine v2. Pure, deterministic and persistence-free. */
export function calculateMarketEngineV2(input: MarketEngineV2Input): MarketEngineV2Result {
  if (input.oldPrice <= 0) throw new Error("Old price must be greater than zero");

  const event = input.event?.verified ? input.event : null;
  const sentimentDirection = event?.sentiment === "positive" ? 1 : event?.sentiment === "negative" ? -1 : 0;
  const reachMultiplier = event ? clamp(Math.log10(Math.max(10, event.reach)) / 7, 0.25, 1.25) : 1;
  const eventMomentum = event ? ((event.momentumScore - 50) / 50) * 0.12 : 0;
  const surpriseImpact = event
    ? event.surpriseDelta * 0.55 * clamp(event.confidence, 0, 1) * clamp(event.viralMultiplier, 0.5, 3)
    : 0;
  const expectedAttentionImpact = event
    ? sentimentDirection * (event.expectedAttention / 100) * 0.3
    : 0;
  const expectationDampener = event
    ? clamp(1 - input.expectationScore / 180, 0.45, 1)
    : 1;
  const eventImpactPercent = (surpriseImpact + eventMomentum + expectedAttentionImpact) *
    clamp(event?.confidence ?? 1, 0, 1) * reachMultiplier * expectationDampener * (event?.decayMultiplier ?? 1);

  const momentumImpactPercent = clamp(input.signedMomentum * 0.015, -0.12, 0.12);
  const grossPressure = Math.max(0, input.buyPressure) + Math.max(0, input.sellPressure);
  const signedPressure = input.buyPressure - input.sellPressure;
  const tradingPressurePercent = clamp(
    (signedPressure / Math.max(grossPressure + input.tradeVolume24h + 100, 100)) * 0.12,
    -0.08,
    0.08
  );

  const signedSignal = eventImpactPercent + momentumImpactPercent + tradingPressurePercent;
  // Randomness can only add symmetric texture to an existing signed signal.
  // With no signal it is exactly zero, so unconditional expected return is zero.
  const randomImpactPercent = Math.abs(signedSignal) > 1e-12
    ? symmetricNoise(`${input.assetSlug}:${input.calculatedAt.slice(0, 16)}`) * 0.01
    : 0;
  let finalPercentageMove = signedSignal + randomImpactPercent;

  const tickLimit = event?.verified
    ? VERIFIED_EVENT_MAX_PRICE_CHANGE_PERCENT
    : MAX_PRICE_CHANGE_PERCENT;
  const beforeTickCap = finalPercentageMove;
  finalPercentageMove = clamp(finalPercentageMove, -tickLimit, tickLimit);
  const tickCapApplied = finalPercentageMove !== beforeTickCap;

  let rollingCapApplied = false;
  if (input.price24hAgo && input.price24hAgo > 0 && !event?.verified) {
    const upperPrice = input.price24hAgo * (1 + MAX_ROLLING_24H_CHANGE_PERCENT / 100);
    const lowerPrice = input.price24hAgo * (1 - MAX_ROLLING_24H_CHANGE_PERCENT / 100);
    const minMove = (lowerPrice / input.oldPrice - 1) * 100;
    const maxMove = (upperPrice / input.oldPrice - 1) * 100;
    const beforeRollingCap = finalPercentageMove;
    if (input.oldPrice > upperPrice) {
      finalPercentageMove = clamp(finalPercentageMove, -tickLimit, 0);
    } else if (input.oldPrice < lowerPrice) {
      finalPercentageMove = clamp(finalPercentageMove, 0, tickLimit);
    } else {
      finalPercentageMove = clamp(finalPercentageMove, minMove, maxMove);
    }
    rollingCapApplied = finalPercentageMove !== beforeRollingCap;
  }

  const material = Math.abs(finalPercentageMove) >= PRICE_MATERIALITY_PERCENT;
  if (!material) finalPercentageMove = 0;

  const newPrice = Math.max(
    MIN_ASSET_PRICE,
    round(input.oldPrice * (1 + finalPercentageMove / 100))
  );
  const nextSignedMomentum = Math.abs(finalPercentageMove) < 1e-12
    ? round(input.signedMomentum * 0.6, 6)
    : round(clamp(input.signedMomentum * 0.6 + finalPercentageMove * 0.08, -10, 10), 6);

  const explanation = generateActiveMarketMovementExplanation({
    assetName: input.assetName,
    material,
    finalPercentageMove,
    materialityThreshold: PRICE_MATERIALITY_PERCENT,
    expectationScore: input.expectationScore,
    event,
    eventImpactPercent,
    momentumImpactPercent,
    tradingPressurePercent,
    randomImpactPercent,
  });

  return {
    newPrice,
    expectedAttention: event?.expectedAttention ?? null,
    actualAttention: event?.actualAttention ?? null,
    surpriseDelta: event?.surpriseDelta ?? 0,
    nextSignedMomentum,
    tradingPressurePercent: round(tradingPressurePercent, 6),
    eventImpactPercent: round(eventImpactPercent, 6),
    momentumImpactPercent: round(momentumImpactPercent, 6),
    randomImpactPercent: round(randomImpactPercent, 6),
    finalPercentageMove: round(finalPercentageMove, 6),
    appliedCaps: [
      { key: event?.verified ? "verified_event" : "normal_tick", limitPercent: tickLimit, applied: tickCapApplied },
      { key: "rolling_24h", limitPercent: MAX_ROLLING_24H_CHANGE_PERCENT, applied: rollingCapApplied },
      { key: "materiality", limitPercent: PRICE_MATERIALITY_PERCENT, applied: !material },
    ],
    material,
    reason: explanation.short,
    detailedExplanation: explanation.detailed,
  };
}

export const MARKET_ENGINE_V2_DRIFT_WARNING_PERCENT = MARKET_DRIFT_WARNING_PERCENT_PER_DAY;

export function selectUnconsumedCultureEvent(
  events: MarketEngineV2EventSignal[],
  assetId: string,
  consumed: ReadonlySet<string>
): MarketEngineV2EventSignal | null {
  return events.find((event) => event.verified && !consumed.has(`${assetId}:${event.id}`)) ?? null;
}
