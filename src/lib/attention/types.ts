import type { AssetCategory } from "@/types/database";

export type AttentionState =
  | "dormant"
  | "emerging"
  | "hot"
  | "peak"
  | "cooling";

export interface PendingImpulse {
  magnitude: number;
  ticksLeft: number;
}

export interface SimulatedCatalyst {
  id: string;
  title: string;
  scheduledAt: string;
  expectedImpact: number;
  eventKind?: string;
  source?: string;
}

export type OutcomeVerdict = "beat" | "meet" | "miss";

export interface EventOutcome {
  title: string;
  source: string;
  eventKind: string;
  occurredAt: string;
  expectationScore: number;
  expectedImpact: number;
  actualImpact: number;
  surpriseDelta: number;
  verdict: OutcomeVerdict;
  priceImpulsePercent: number;
  headline: string;
}

export interface SimulatedVerifiedEvent {
  id: string;
  title: string;
  impact: number;
  source: string;
  occurredAt: string;
  expiresAt: string;
  eventKind: string;
  expectedImpact?: number;
  actualImpact?: number;
  surpriseDelta?: number;
  verdict?: OutcomeVerdict;
}

export interface CatalystWithAsset extends SimulatedCatalyst {
  assetSlug: string;
  assetName: string;
}

export interface ProjectionPoint {
  simTime: string;
  dayOffset: number;
  attentionScore: number;
  baselineRelevance: number;
  attentionState: AttentionState;
  isProjected: boolean;
  catalystFired?: string;
}

export interface StateTransition {
  simTime: string;
  from: AttentionState;
  to: AttentionState;
  label: string;
}

export interface LifecycleEntry {
  simTime: string;
  attentionScore: number;
  attentionState: AttentionState;
  changePercent: number;
  isProjected: boolean;
}

export interface AssetProjection {
  slug: string;
  name: string;
  currentAttention: number;
  currentState: AttentionState;
  projectedPeak: number;
  projectedPeakDay: number;
  points: ProjectionPoint[];
  transitions: StateTransition[];
}

export interface WhyItMovedLane {
  key: string;
  label: string;
  impactPercent: number;
}

export interface HistoryPoint {
  simTime: string;
  price: number;
  attentionScore: number;
  changePercent: number;
  attentionState?: AttentionState;
}

export interface SimulatedAsset {
  slug: string;
  name: string;
  category: AssetCategory;
  currentPrice: number;
  baselineRelevance: number;
  attentionScore: number;
  expectationScore: number;
  attentionHalfLife: number;
  attentionAcceleration: number;
  fairValueAnchor: number;
  lastVerifiedEventAt: string | null;
  pendingImpulse: PendingImpulse | null;
  volatility: number;
  momentumScore: number;
  buyPressure: number;
  sellPressure: number;
  activeEvents: SimulatedVerifiedEvent[];
  catalysts: SimulatedCatalyst[];
  recentOutcomes: EventOutcome[];
  history: HistoryPoint[];
  lastTick: {
    changePercent: number;
    lanes: WhyItMovedLane[];
    reason: string;
    attentionState: AttentionState;
    lastOutcome?: EventOutcome;
  } | null;
}

export interface SampleEventDefinition {
  id: string;
  slug: string;
  label: string;
  title: string;
  expectedImpact: number;
  actualImpact: number;
  source: string;
  eventKind: string;
  scenarioNote?: string;
}

export interface SimulationState {
  simTime: string;
  startedAt: string;
  tickCount: number;
  assets: SimulatedAsset[];
  selectedSlug: string;
}
