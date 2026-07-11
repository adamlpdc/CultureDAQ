import { TICK_MINUTES, TICKS_PER_DAY } from "@/lib/attention/constants";
import { applyBaselineDecay, deriveAttentionState } from "@/lib/attention/engine";
import { resolveDueCatalyst } from "@/lib/attention/sandbox-engine";
import type {
  AssetProjection,
  AttentionState,
  CatalystWithAsset,
  LifecycleEntry,
  ProjectionPoint,
  SimulatedAsset,
  SimulatedCatalyst,
  StateTransition,
} from "@/lib/attention/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function advanceSimTime(iso: string, ticks: number): string {
  return new Date(
    new Date(iso).getTime() + ticks * TICK_MINUTES * 60 * 1000
  ).toISOString();
}

function cloneForProjection(asset: SimulatedAsset): SimulatedAsset {
  return {
    ...asset,
    catalysts: asset.catalysts.map((c) => ({ ...c })),
    activeEvents: asset.activeEvents.map((e) => ({ ...e })),
    recentOutcomes: asset.recentOutcomes.map((o) => ({ ...o })),
    history: asset.history.map((h) => ({ ...h })),
    pendingImpulse: asset.pendingImpulse ? { ...asset.pendingImpulse } : null,
  };
}

function applyAnticipationOnly(
  asset: SimulatedAsset,
  simTime: string
): void {
  const now = new Date(simTime).getTime();

  for (const catalyst of asset.catalysts) {
    const hoursUntil =
      (new Date(catalyst.scheduledAt).getTime() - now) / (60 * 60 * 1000);
    if (hoursUntil <= 0 || hoursUntil > 72) continue;

    const proximity = 1 - (hoursUntil / 72) ** 2;
    asset.expectationScore = clamp(
      asset.expectationScore + proximity * catalyst.expectedImpact * 2,
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

function getDueCatalysts(
  asset: SimulatedAsset,
  simTime: string,
  firedIds: Set<string>
): SimulatedCatalyst[] {
  const now = new Date(simTime).getTime();
  return asset.catalysts.filter((c) => {
    if (firedIds.has(c.id)) return false;
    return new Date(c.scheduledAt).getTime() <= now;
  });
}

function detectTransition(
  prev: AttentionState | null,
  next: AttentionState,
  simTime: string
): StateTransition | null {
  if (!prev || prev === next) return null;
  return {
    simTime,
    from: prev,
    to: next,
    label: `${prev} → ${next}`,
  };
}

export function projectAttention30Days(
  asset: SimulatedAsset,
  simTime: string
): AssetProjection {
  let clone = cloneForProjection(asset);
  const firedIds = new Set<string>();
  const points: ProjectionPoint[] = [];
  const transitions: StateTransition[] = [];
  let prevState =
    asset.lastTick?.attentionState ?? deriveAttentionState(asset, simTime);

  points.push({
    simTime,
    dayOffset: 0,
    attentionScore: Math.round(clone.attentionScore * 10) / 10,
    baselineRelevance: clone.baselineRelevance,
    attentionState: prevState,
    isProjected: false,
  });

  let peak = clone.attentionScore;
  let peakDay = 0;

  for (let tick = 1; tick <= TICKS_PER_DAY * 30; tick++) {
    const tickTime = advanceSimTime(simTime, tick);

    applyBaselineDecay(clone);
    applyAnticipationOnly(clone, tickTime);

    const due = getDueCatalysts(clone, tickTime, firedIds);
    let catalystFired: string | undefined;
    for (const catalyst of due) {
      clone = resolveDueCatalyst(
        clone,
        catalyst,
        tickTime,
        `proj-${clone.slug}-${catalyst.id}-${tick}`
      );
      firedIds.add(catalyst.id);
      catalystFired = catalyst.title;
    }

    clone.catalysts = clone.catalysts.filter((c) => !firedIds.has(c.id));

    const state = deriveAttentionState(clone, tickTime);
    const transition = detectTransition(prevState, state, tickTime);
    if (transition) transitions.push(transition);
    prevState = state;

    if (clone.attentionScore > peak) {
      peak = clone.attentionScore;
      peakDay = Math.floor(tick / TICKS_PER_DAY);
    }

    if (tick % TICKS_PER_DAY === 0) {
      const dayOffset = tick / TICKS_PER_DAY;
      points.push({
        simTime: tickTime,
        dayOffset,
        attentionScore: Math.round(clone.attentionScore * 10) / 10,
        baselineRelevance: Math.round(clone.baselineRelevance * 10) / 10,
        attentionState: state,
        isProjected: true,
        catalystFired,
      });
    }
  }

  return {
    slug: asset.slug,
    name: asset.name,
    currentAttention: asset.attentionScore,
    currentState:
      asset.lastTick?.attentionState ?? deriveAttentionState(asset, simTime),
    projectedPeak: Math.round(peak * 10) / 10,
    projectedPeakDay: peakDay,
    points,
    transitions,
  };
}

export function getAllUpcomingCatalysts(
  assets: SimulatedAsset[],
  simTime: string
): CatalystWithAsset[] {
  const now = new Date(simTime).getTime();

  return assets
    .flatMap((asset) =>
      asset.catalysts
        .filter((c) => new Date(c.scheduledAt).getTime() > now)
        .map((c) => ({
          ...c,
          assetSlug: asset.slug,
          assetName: asset.name,
        }))
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
}

export function formatCatalystCountdown(
  scheduledAt: string,
  simTime: string
): { label: string; urgency: "soon" | "medium" | "far" | "past" } {
  const ms = new Date(scheduledAt).getTime() - new Date(simTime).getTime();

  if (ms <= 0) {
    return { label: "Due now", urgency: "past" };
  }

  const totalMinutes = Math.floor(ms / (60 * 1000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  let label: string;
  if (days > 0) label = `${days}d ${hours}h`;
  else if (hours > 0) label = `${hours}h ${minutes}m`;
  else label = `${minutes}m`;

  const urgency =
    totalMinutes <= 24 * 60 ? "soon" : totalMinutes <= 72 * 60 ? "medium" : "far";

  return { label, urgency };
}

export function buildLifecycleHistory(
  asset: SimulatedAsset,
  simTime: string,
  projection?: AssetProjection
): LifecycleEntry[] {
  const entries: LifecycleEntry[] = [];
  let prevState: AttentionState | null = null;

  const historical = asset.history.filter(
    (h) => new Date(h.simTime).getTime() <= new Date(simTime).getTime()
  );

  for (const point of historical) {
    const snapshot: SimulatedAsset = {
      ...asset,
      attentionScore: point.attentionScore,
      history: historical.filter(
        (h) => new Date(h.simTime).getTime() <= new Date(point.simTime).getTime()
      ),
    };
    const state =
      point.attentionState ?? deriveAttentionState(snapshot, point.simTime);

    if (state !== prevState) {
      entries.push({
        simTime: point.simTime,
        attentionScore: point.attentionScore,
        attentionState: state,
        changePercent: point.changePercent,
        isProjected: false,
      });
      prevState = state;
    }
  }

  if (projection) {
    for (const point of projection.transitions) {
      const projPoint = projection.points.find((p) => p.simTime === point.simTime);
      entries.push({
        simTime: point.simTime,
        attentionScore: projPoint?.attentionScore ?? asset.attentionScore,
        attentionState: point.to,
        changePercent: 0,
        isProjected: true,
      });
    }
  }

  return entries.slice(-20);
}

export function getAttentionHeatLevel(score: number): number {
  return clamp(score / 100, 0, 1);
}

export function getProjectedGain(projection: AssetProjection): number {
  return projection.projectedPeak - projection.currentAttention;
}

export function rankAssetsByUpcomingAttention(
  assets: SimulatedAsset[],
  simTime: string
): { slug: string; name: string; projectedGain: number; nextCatalyst?: string }[] {
  return assets
    .map((asset) => {
      const projection = projectAttention30Days(asset, simTime);
      const next = asset.catalysts
        .filter((c) => new Date(c.scheduledAt).getTime() > new Date(simTime).getTime())
        .sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        )[0];

      return {
        slug: asset.slug,
        name: asset.name,
        projectedGain: getProjectedGain(projection),
        nextCatalyst: next?.title,
      };
    })
    .sort((a, b) => b.projectedGain - a.projectedGain);
}
