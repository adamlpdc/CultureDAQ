import { MIN_ASSET_PRICE } from "@/lib/constants";
import {
  ATTENTION_MAX_TICK_PERCENT,
  ATTENTION_SPIKE,
  DEMAND_CAP_PERCENT,
  EVENT_HALF_LIFE_HOURS,
  FAIR_VALUE_K,
  REVERSION_RATE_BASE,
  STATE_DEMAND_MULTIPLIER,
  TICK_MINUTES,
  VERIFIED_IMPULSE,
} from "@/lib/attention/constants";
import type {
  AttentionState,
  HistoryPoint,
  PendingImpulse,
  SimulatedAsset,
  SimulatedCatalyst,
  SimulatedVerifiedEvent,
  WhyItMovedLane,
} from "@/lib/attention/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

function ticksToMs(ticks: number): number {
  return ticks * TICK_MINUTES * 60 * 1000;
}

export function deriveAttentionState(
  asset: SimulatedAsset,
  simTime: string
): AttentionState {
  const { attentionScore, baselineRelevance, lastVerifiedEventAt } = asset;
  const now = new Date(simTime).getTime();
  const peakThreshold = baselineRelevance + 25;
  const hotThreshold = baselineRelevance + 12;

  const recentHigh = getAttentionHighInWindow(asset.history, simTime, 72);
  const wasPeakClass = recentHigh >= peakThreshold;
  const cooling =
    wasPeakClass && recentHigh - attentionScore >= 8 && attentionScore < recentHigh;

  if (cooling) return "cooling";

  if (
    attentionScore >= peakThreshold ||
    (lastVerifiedEventAt &&
      now - new Date(lastVerifiedEventAt).getTime() <= 6 * 60 * 60 * 1000 &&
      asset.activeEvents.some((e) => e.impact >= 4))
  ) {
    return "peak";
  }

  if (attentionScore >= hotThreshold) return "hot";

  const rising = getAttentionDelta(asset.history, simTime, 48);
  if (rising >= 4 && attentionScore > baselineRelevance) return "emerging";

  if (attentionScore <= baselineRelevance + 3 || attentionScore < 25) {
    return "dormant";
  }

  return "emerging";
}

function getAttentionHighInWindow(
  history: HistoryPoint[],
  simTime: string,
  hours: number
): number {
  const cutoff = new Date(simTime).getTime() - hours * 60 * 60 * 1000;
  const inWindow = history.filter(
    (h) => new Date(h.simTime).getTime() >= cutoff
  );
  if (inWindow.length === 0) return 0;
  return Math.max(...inWindow.map((h) => h.attentionScore));
}

function getAttentionDelta(
  history: HistoryPoint[],
  simTime: string,
  hours: number
): number {
  const cutoff = new Date(simTime).getTime() - hours * 60 * 60 * 1000;
  const oldest = history.find(
    (h) => new Date(h.simTime).getTime() >= cutoff
  );
  if (!oldest) return 0;
  const current = history[history.length - 1]?.attentionScore ?? oldest.attentionScore;
  return current - oldest.attentionScore;
}

export function applyBaselineDecay(asset: SimulatedAsset): void {
  const dtHours = TICK_MINUTES / 60;
  const decayFactor = 0.5 ** (dtHours / asset.attentionHalfLife);
  asset.attentionScore =
    asset.baselineRelevance +
    (asset.attentionScore - asset.baselineRelevance) * decayFactor;

  asset.baselineRelevance = clamp(
    asset.baselineRelevance +
      (asset.attentionScore - asset.baselineRelevance) * 0.00005,
    10,
    85
  );
}

function applyAnticipationAttention(
  asset: SimulatedAsset,
  catalysts: SimulatedCatalyst[],
  simTime: string
): number {
  const now = new Date(simTime).getTime();
  let anticipationDrift = 0;

  for (const catalyst of catalysts) {
    const hoursUntil =
      (new Date(catalyst.scheduledAt).getTime() - now) / (60 * 60 * 1000);
    if (hoursUntil <= 0 || hoursUntil > 72) continue;

    const proximity = 1 - (hoursUntil / 72) ** 2;
    asset.attentionScore = clamp(
      asset.attentionScore + proximity * catalyst.expectedImpact * 0.15,
      0,
      100
    );
    asset.attentionAcceleration += 0.05 * proximity;
    anticipationDrift +=
      Math.sign(catalyst.expectedImpact) * proximity * 0.12 * asset.volatility;
  }

  return anticipationDrift;
}

function calcAttentionDrift(asset: SimulatedAsset): number {
  const attentionDelta = asset.attentionScore - asset.baselineRelevance;
  const fairValue =
    asset.fairValueAnchor * (1 + (FAIR_VALUE_K * attentionDelta) / 100);
  const gap = (fairValue - asset.currentPrice) / asset.currentPrice;
  const reversionRate = REVERSION_RATE_BASE * asset.volatility;
  return gap * reversionRate * 100;
}

function consumeImpulseTail(impulse: PendingImpulse | null): {
  impact: number;
  next: PendingImpulse | null;
} {
  if (!impulse || impulse.ticksLeft <= 0) {
    return { impact: 0, next: null };
  }
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
  const liquidityDivisor =
    Math.max(1000, 1000) + Math.abs(asset.buyPressure - asset.sellPressure) + 500;
  const rawPressure = (asset.buyPressure - asset.sellPressure) / liquidityDivisor;
  const effective =
    Math.sign(rawPressure) * Math.sqrt(Math.abs(rawPressure)) * asset.volatility;
  const multiplier = STATE_DEMAND_MULTIPLIER[state] ?? 1;
  const impact = effective * multiplier * 0.015 * 100;
  const noise =
    (seededRandom(`${asset.slug}-demand-${simTime}-${tickIndex}`) - 0.5) * 0.08;
  return clamp((impact + noise) * asset.volatility, -DEMAND_CAP_PERCENT, DEMAND_CAP_PERCENT);
}

function calcMicroNoise(
  asset: SimulatedAsset,
  simTime: string,
  tickIndex: number
): number {
  const r = seededRandom(`${asset.slug}-noise-${simTime}-${tickIndex}`);
  return (r - 0.5) * 0.012 * asset.volatility * 100;
}

function updateMomentum(asset: SimulatedAsset, changePercent: number): void {
  asset.momentumScore = clamp(
    asset.momentumScore * 0.7 + changePercent * 0.1 + asset.attentionAcceleration * 0.08,
    -10,
    10
  );
}

function decayPressures(asset: SimulatedAsset): void {
  asset.buyPressure = Math.max(0, asset.buyPressure * 0.5);
  asset.sellPressure = Math.max(0, asset.sellPressure * 0.5);
}

function updateFairValueAnchor(asset: SimulatedAsset): void {
  asset.fairValueAnchor =
    asset.fairValueAnchor * 0.998 + asset.currentPrice * 0.002;
}

function buildReason(lanes: WhyItMovedLane[]): string {
  const significant = lanes
    .filter((l) => Math.abs(l.impactPercent) > 0.01)
    .sort((a, b) => Math.abs(b.impactPercent) - Math.abs(a.impactPercent));

  if (significant.length === 0) {
    return "Quiet session — attention near baseline with minor noise.";
  }

  const primary = significant[0];
  let reason = primary.label;
  if (
    significant[1] &&
    Math.abs(significant[1].impactPercent) >
      Math.abs(primary.impactPercent) * 0.45
  ) {
    reason += ` · ${significant[1].label}`;
  }
  return reason;
}

export interface TickOptions {
  simTime: string;
  tickIndex: number;
  simulateDemand?: boolean;
}

export function runAttentionTick(
  asset: SimulatedAsset,
  options: TickOptions
): SimulatedAsset {
  const { simTime, tickIndex, simulateDemand = true } = options;
  const prevAttention = asset.attentionScore;

  applyBaselineDecay(asset);
  const anticipationDrift = applyAnticipationAttention(
    asset,
    asset.catalysts,
    simTime
  );

  asset.attentionAcceleration =
    asset.attentionAcceleration * 0.88 +
    (asset.attentionScore - prevAttention) * 0.15;

  if (simulateDemand) {
    const rng = seededRandom(`${asset.slug}-pressure-${simTime}-${tickIndex}`);
    if (rng > 0.55) asset.buyPressure += rng * 4;
    else if (rng < 0.45) asset.sellPressure += (1 - rng) * 4;
  }

  const attentionState = deriveAttentionState(asset, simTime);

  const attentionDrift = calcAttentionDrift(asset);
  const { impact: verifiedImpulse, next } = consumeImpulseTail(asset.pendingImpulse);
  asset.pendingImpulse = next;

  const demandImpact = calcDemandImpact(asset, attentionState, simTime, tickIndex);
  const microNoise = calcMicroNoise(asset, simTime, tickIndex);

  const lanes: WhyItMovedLane[] = [];

  if (Math.abs(attentionDrift) > 0.005) {
    lanes.push({
      key: "attention_drift",
      label: `Attention ${attentionState} — fair-value pull (${attentionState})`,
      impactPercent: attentionDrift,
    });
  }

  if (Math.abs(verifiedImpulse) > 0.005) {
    lanes.push({
      key: "verified_impulse",
      label: "Verified event impulse (tail)",
      impactPercent: verifiedImpulse,
    });
  }

  if (Math.abs(anticipationDrift) > 0.005) {
    lanes.push({
      key: "anticipation",
      label: "Upcoming catalyst anticipation",
      impactPercent: anticipationDrift,
    });
  }

  if (Math.abs(demandImpact) > 0.005) {
    lanes.push({
      key: "demand",
      label:
        demandImpact > 0
          ? "Net buying interest (capped demand)"
          : "Net selling interest (capped demand)",
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

  updateMomentum(asset, totalChange);
  decayPressures(asset);
  updateFairValueAnchor(asset);

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
    reason: buildReason(lanes),
    attentionState,
  };

  return asset;
}

export function applyVerifiedEvent(
  asset: SimulatedAsset,
  event: Omit<SimulatedVerifiedEvent, "id" | "occurredAt" | "expiresAt"> & {
    occurredAt: string;
  }
): SimulatedAsset {
  const spike = ATTENTION_SPIKE[event.impact] ?? 15;
  const impulse = VERIFIED_IMPULSE[event.impact] ?? 0.9;
  const halfLife =
    EVENT_HALF_LIFE_HOURS[event.eventKind] ?? EVENT_HALF_LIFE_HOURS.default;

  asset.attentionScore = clamp(asset.attentionScore + spike, 0, 100);
  asset.attentionHalfLife = halfLife;
  asset.attentionAcceleration += spike * 0.12;
  asset.lastVerifiedEventAt = event.occurredAt;
  asset.pendingImpulse = { magnitude: impulse, ticksLeft: 4 };

  const verified: SimulatedVerifiedEvent = {
    ...event,
    id: `${event.eventKind}-${event.occurredAt}`,
    expiresAt: new Date(
      new Date(event.occurredAt).getTime() + halfLife * 60 * 60 * 1000
    ).toISOString(),
  };

  asset.activeEvents = [
    verified,
    ...asset.activeEvents.filter((e) => new Date(e.expiresAt) > new Date(event.occurredAt)),
  ].slice(0, 8);

  return asset;
}

export function pruneExpiredEvents(asset: SimulatedAsset, simTime: string): void {
  const now = new Date(simTime).getTime();
  asset.activeEvents = asset.activeEvents.filter(
    (e) => new Date(e.expiresAt).getTime() > now
  );
  asset.catalysts = asset.catalysts.filter(
    (c) => new Date(c.scheduledAt).getTime() > now
  );
}

export function getPriceChange24h(asset: SimulatedAsset, simTime: string): number {
  const ticksPerDay = (24 * 60) / TICK_MINUTES;
  const targetTime = new Date(simTime).getTime() - ticksToMs(ticksPerDay);

  let ref = asset.history[0];
  for (const point of asset.history) {
    if (new Date(point.simTime).getTime() <= targetTime) ref = point;
    else break;
  }

  if (!ref || ref.price === 0) return 0;
  return ((asset.currentPrice - ref.price) / ref.price) * 100;
}
