import { MIN_ASSET_PRICE } from "@/lib/constants";
import { ATTENTION_MAX_TICK_PERCENT, EVENT_HALF_LIFE_HOURS } from "@/lib/attention/constants";
import {
  applyBaselineDecay,
  deriveAttentionState,
  seededRandom,
} from "@/lib/attention/engine";
import {
  buildOutcome,
  calcAnticipationPriceDrift,
  estimateAnticipationPricedIn,
  MEET_ANTICIPATION_UNWIND_FACTOR,
  MISS_ANTICIPATION_UNWIND_FACTOR,
  HIGH_EXPECTATION_MEET_UNWIND_FACTOR,
  HIGH_EXPECTATION_SCORE_THRESHOLD,
  rollActualImpact,
  SANDBOX_FAIR_VALUE_K,
  SANDBOX_REVERSION_RATE,
  surpriseToAttentionDelta,
} from "@/lib/attention/expectation";
import type {
  AttentionState,
  EventOutcome,
  PendingImpulse,
  SimulatedAsset,
  SimulatedCatalyst,
  SimulatedVerifiedEvent,
  WhyItMovedLane,
} from "@/lib/attention/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function applyExpectationAnticipation(asset: SimulatedAsset, simTime: string): void {
  const now = new Date(simTime).getTime();

  for (const catalyst of asset.catalysts) {
    const hoursUntil =
      (new Date(catalyst.scheduledAt).getTime() - now) / (60 * 60 * 1000);
    if (hoursUntil <= 0 || hoursUntil > 72) continue;

    const proximity = 1 - (hoursUntil / 72) ** 2;
    asset.expectationScore = clamp(
      asset.expectationScore + proximity * catalyst.expectedImpact * 2.2,
      0,
      100
    );
    asset.attentionScore = clamp(
      asset.attentionScore + proximity * catalyst.expectedImpact * 0.08,
      0,
      100
    );
  }
}

function calcSandboxAttentionDrift(asset: SimulatedAsset): number {
  const attentionDelta = asset.attentionScore - asset.baselineRelevance;
  const fairValue =
    asset.fairValueAnchor * (1 + (SANDBOX_FAIR_VALUE_K * attentionDelta) / 100);
  const gap = (fairValue - asset.currentPrice) / asset.currentPrice;
  return gap * SANDBOX_REVERSION_RATE * asset.volatility * 100;
}

function consumeImpulseTail(impulse: PendingImpulse | null): {
  impact: number;
  next: PendingImpulse | null;
} {
  if (!impulse || impulse.ticksLeft <= 0) return { impact: 0, next: null };
  const impact = impulse.magnitude * (impulse.ticksLeft / 4);
  const next =
    impulse.ticksLeft <= 1
      ? null
      : { magnitude: impulse.magnitude, ticksLeft: impulse.ticksLeft - 1 };
  return { impact, next };
}

function calcDemandImpact(
  asset: SimulatedAsset,
  state: AttentionState,
  simTime: string,
  tickIndex: number
): number {
  const rawPressure =
    (asset.buyPressure - asset.sellPressure) /
    (1500 + Math.abs(asset.buyPressure - asset.sellPressure));
  const effective =
    Math.sign(rawPressure) * Math.sqrt(Math.abs(rawPressure)) * asset.volatility;
  const multipliers: Record<AttentionState, number> = {
    dormant: 0.6,
    emerging: 0.85,
    hot: 1.0,
    peak: 0.5,
    cooling: 0.35,
  };
  const noise =
    (seededRandom(`${asset.slug}-demand-${simTime}-${tickIndex}`) - 0.5) * 0.06;
  return clamp(
    (effective * (multipliers[state] ?? 1) * 0.012 + noise) * 100,
    -0.3,
    0.3
  );
}

function calcMicroNoise(asset: SimulatedAsset, simTime: string, tickIndex: number): number {
  const r = seededRandom(`${asset.slug}-noise-${simTime}-${tickIndex}`);
  return (r - 0.5) * 0.008 * asset.volatility * 100;
}

function calcDisappointmentHangoverDrift(asset: SimulatedAsset, simTime: string): number {
  const disappointment = asset.recentOutcomes.find(
    (o) =>
      o.verdict === "miss" ||
      (o.verdict === "meet" && o.expectationScore >= HIGH_EXPECTATION_SCORE_THRESHOLD)
  );
  if (!disappointment) return 0;

  const hoursSince =
    (new Date(simTime).getTime() - new Date(disappointment.occurredAt).getTime()) /
    (60 * 60 * 1000);
  if (hoursSince < 0 || hoursSince > 144) return 0;

  const decay = 1 - hoursSince / 144;
  const severity =
    disappointment.verdict === "miss"
      ? 1 + Math.abs(disappointment.surpriseDelta) * 0.15
      : 0.45;
  return -0.006 * decay * severity * asset.volatility * 100;
}

export interface SandboxTickOptions {
  simTime: string;
  tickIndex: number;
  simulateDemand?: boolean;
}

export function runSandboxTick(
  asset: SimulatedAsset,
  options: SandboxTickOptions
): SimulatedAsset {
  const { simTime, tickIndex, simulateDemand = true } = options;
  const prevAttention = asset.attentionScore;
  const lastOutcome = asset.lastTick?.lastOutcome;

  applyBaselineDecay(asset);
  applyExpectationAnticipation(asset, simTime);

  asset.attentionAcceleration =
    asset.attentionAcceleration * 0.88 +
    (asset.attentionScore - prevAttention) * 0.15;

  if (simulateDemand) {
    const rng = seededRandom(`${asset.slug}-pressure-${simTime}-${tickIndex}`);
    if (rng > 0.55) asset.buyPressure += rng * 3;
    else if (rng < 0.45) asset.sellPressure += (1 - rng) * 3;
  }

  const attentionState = deriveAttentionState(asset, simTime);
  const attentionDrift = calcSandboxAttentionDrift(asset);
  const anticipationDrift = calcAnticipationPriceDrift(asset, simTime);
  const hangoverDrift = calcDisappointmentHangoverDrift(asset, simTime);
  const { impact: verifiedImpulse, next } = consumeImpulseTail(asset.pendingImpulse);
  asset.pendingImpulse = next;
  const demandImpact = calcDemandImpact(asset, attentionState, simTime, tickIndex);
  const microNoise = calcMicroNoise(asset, simTime, tickIndex);

  const lanes: WhyItMovedLane[] = [];

  if (Math.abs(attentionDrift) > 0.005) {
    lanes.push({
      key: "attention_drift",
      label: `Attention ${attentionState} — fair-value pull`,
      impactPercent: attentionDrift,
    });
  }
  if (Math.abs(verifiedImpulse) > 0.005) {
    lanes.push({
      key: "surprise_impulse",
      label: "Expectation vs reality impulse (tail)",
      impactPercent: verifiedImpulse,
    });
  }
  if (Math.abs(anticipationDrift) > 0.005) {
    lanes.push({
      key: "anticipation",
      label: "Market pricing in expected outcome",
      impactPercent: anticipationDrift,
    });
  }
  if (Math.abs(hangoverDrift) > 0.005) {
    lanes.push({
      key: "miss_hangover",
      label: "Post-miss attention hangover",
      impactPercent: hangoverDrift,
    });
  }
  if (Math.abs(demandImpact) > 0.005) {
    lanes.push({
      key: "demand",
      label: demandImpact > 0 ? "Net buying (capped)" : "Net selling (capped)",
      impactPercent: demandImpact,
    });
  }
  if (Math.abs(microNoise) > 0.005) {
    lanes.push({
      key: "micro_noise",
      label: "Session micro-noise",
      impactPercent: microNoise,
    });
  }

  let totalChange = lanes.reduce((sum, l) => sum + l.impactPercent, 0);
  totalChange = clamp(totalChange, -ATTENTION_MAX_TICK_PERCENT, ATTENTION_MAX_TICK_PERCENT);

  const oldPrice = asset.currentPrice;
  asset.currentPrice = Math.max(
    MIN_ASSET_PRICE,
    Math.round(oldPrice * (1 + totalChange / 100) * 10000) / 10000
  );

  asset.momentumScore = clamp(
    asset.momentumScore * 0.7 + totalChange * 0.1 + asset.attentionAcceleration * 0.08,
    -10,
    10
  );
  asset.buyPressure = Math.max(0, asset.buyPressure * 0.5);
  asset.sellPressure = Math.max(0, asset.sellPressure * 0.5);
  asset.fairValueAnchor = asset.fairValueAnchor * 0.998 + asset.currentPrice * 0.002;

  asset.history.push({
    simTime,
    price: asset.currentPrice,
    attentionScore: Math.round(asset.attentionScore * 10) / 10,
    changePercent: Math.round(totalChange * 100) / 100,
    attentionState,
  });

  asset.lastTick = {
    changePercent: Math.round(totalChange * 100) / 100,
    lanes: lanes.map((l) => ({
      ...l,
      impactPercent: Math.round(l.impactPercent * 100) / 100,
    })),
    reason: buildSandboxReason(lanes, lastOutcome),
    attentionState,
    lastOutcome,
  };

  return asset;
}

function buildSandboxReason(
  lanes: WhyItMovedLane[],
  outcome?: EventOutcome
): string {
  if (outcome) {
    return `${outcome.headline} (${outcome.priceImpulsePercent >= 0 ? "+" : ""}${outcome.priceImpulsePercent.toFixed(2)}%)`;
  }
  const significant = lanes
    .filter((l) => Math.abs(l.impactPercent) > 0.01)
    .sort((a, b) => Math.abs(b.impactPercent) - Math.abs(a.impactPercent));
  if (significant.length === 0) {
    return "Quiet session — expectations and attention near equilibrium.";
  }
  return significant[0].label;
}

export interface ResolveEventParams {
  title: string;
  source: string;
  eventKind: string;
  occurredAt: string;
  expectedImpact: number;
  actualImpact?: number;
  outcomeSeed?: string;
}

export function applyExpectationEvent(
  asset: SimulatedAsset,
  params: ResolveEventParams
): { asset: SimulatedAsset; outcome: EventOutcome } {
  const actualImpact =
    params.actualImpact ??
    rollActualImpact(
      params.expectedImpact,
      asset.expectationScore,
      params.outcomeSeed ?? `${asset.slug}-${params.occurredAt}`
    );

  const outcome = buildOutcome({
    title: params.title,
    source: params.source,
    eventKind: params.eventKind,
    occurredAt: params.occurredAt,
    expectedImpact: params.expectedImpact,
    actualImpact,
    expectationScore: asset.expectationScore,
  });

  const halfLife =
    EVENT_HALF_LIFE_HOURS[params.eventKind] ?? EVENT_HALF_LIFE_HOURS.default;

  const pricedIn = estimateAnticipationPricedIn(asset, params.expectedImpact);
  let priceImpulse = outcome.priceImpulsePercent;
  if (outcome.verdict === "miss") {
    priceImpulse -= pricedIn * MISS_ANTICIPATION_UNWIND_FACTOR;
  } else if (
    outcome.verdict === "meet" &&
    asset.expectationScore >= HIGH_EXPECTATION_SCORE_THRESHOLD
  ) {
    priceImpulse -= pricedIn * HIGH_EXPECTATION_MEET_UNWIND_FACTOR;
  } else if (outcome.verdict === "meet") {
    priceImpulse -= pricedIn * MEET_ANTICIPATION_UNWIND_FACTOR;
  }
  outcome.priceImpulsePercent = Math.round(priceImpulse * 100) / 100;

  const attnDelta = surpriseToAttentionDelta(outcome.surpriseDelta);
  asset.attentionScore = clamp(asset.attentionScore + attnDelta, 0, 100);
  asset.expectationScore = clamp(
    asset.expectationScore - outcome.surpriseDelta * 8,
    0,
    100
  );

  let impulseTicks = 4;
  if (outcome.verdict === "miss") {
    asset.attentionScore = clamp(
      asset.attentionScore - 10 - Math.abs(outcome.surpriseDelta) * 3,
      0,
      100
    );
    asset.expectationScore = clamp(asset.expectationScore - 12, 0, 100);
    asset.attentionHalfLife = halfLife * 1.4;
    asset.sellPressure += 50;
    asset.buyPressure = Math.max(0, asset.buyPressure * 0.4);
    impulseTicks = 5;
  } else if (
    outcome.verdict === "meet" &&
    asset.expectationScore >= HIGH_EXPECTATION_SCORE_THRESHOLD
  ) {
    asset.attentionScore = clamp(asset.attentionScore - 5, 0, 100);
    asset.expectationScore = clamp(asset.expectationScore - 6, 0, 100);
    asset.attentionHalfLife = halfLife * 1.1;
    asset.sellPressure += 25;
    impulseTicks = 4;
  } else {
    asset.attentionHalfLife = halfLife;
  }

  asset.attentionAcceleration += attnDelta * 0.1;
  asset.lastVerifiedEventAt = params.occurredAt;
  asset.pendingImpulse = {
    magnitude: outcome.priceImpulsePercent,
    ticksLeft: impulseTicks,
  };

  const verified: SimulatedVerifiedEvent = {
    id: `${params.eventKind}-${params.occurredAt}`,
    title: params.title,
    impact: actualImpact,
    source: params.source,
    occurredAt: params.occurredAt,
    expiresAt: new Date(
      new Date(params.occurredAt).getTime() + halfLife * 60 * 60 * 1000
    ).toISOString(),
    eventKind: params.eventKind,
    expectedImpact: params.expectedImpact,
    actualImpact,
    surpriseDelta: outcome.surpriseDelta,
    verdict: outcome.verdict,
  };

  asset.activeEvents = [verified, ...asset.activeEvents].slice(0, 8);
  asset.recentOutcomes = [outcome, ...asset.recentOutcomes].slice(0, 6);

  asset.lastTick = {
    changePercent: 0,
    lanes: [],
    reason: outcome.headline,
    attentionState: deriveAttentionState(asset, params.occurredAt),
    lastOutcome: outcome,
  };

  return { asset, outcome };
}

export function resolveDueCatalyst(
  asset: SimulatedAsset,
  catalyst: SimulatedCatalyst,
  simTime: string,
  seed: string
): SimulatedAsset {
  const { asset: updated } = applyExpectationEvent(asset, {
    title: catalyst.title,
    source: catalyst.source ?? "scheduled",
    eventKind: catalyst.eventKind ?? "default",
    occurredAt: simTime,
    expectedImpact: catalyst.expectedImpact,
    outcomeSeed: seed,
  });
  updated.catalysts = updated.catalysts.filter((c) => c.id !== catalyst.id);
  return updated;
}

export function pruneSandboxEvents(asset: SimulatedAsset, simTime: string): void {
  const now = new Date(simTime).getTime();
  asset.activeEvents = asset.activeEvents.filter(
    (e) => new Date(e.expiresAt).getTime() > now
  );
}
