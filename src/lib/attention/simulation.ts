import { TICKS_PER_DAY } from "@/lib/attention/constants";
import {
  applyExpectationEvent,
  pruneSandboxEvents,
  resolveDueCatalyst,
  runSandboxTick,
} from "@/lib/attention/sandbox-engine";
import type {
  SampleEventDefinition,
  SimulatedAsset,
  SimulationState,
} from "@/lib/attention/types";
import { createInitialAssets } from "@/lib/attention/sample-assets";

const MAX_HISTORY_POINTS = TICKS_PER_DAY * 30 + 96;

function trimHistory(assets: SimulatedAsset[]): SimulatedAsset[] {
  return assets.map((a) => ({
    ...a,
    history:
      a.history.length > MAX_HISTORY_POINTS
        ? a.history.slice(-MAX_HISTORY_POINTS)
        : a.history,
  }));
}

function advanceSimTime(iso: string, ticks: number): string {
  return new Date(
    new Date(iso).getTime() + ticks * 15 * 60 * 1000
  ).toISOString();
}

export function createInitialSimulation(): SimulationState {
  const now = new Date().toISOString();
  const assets = createInitialAssets(now);

  return {
    simTime: now,
    startedAt: now,
    tickCount: 0,
    assets,
    selectedSlug: "taylor-swift",
  };
}

function getDueCatalysts(asset: SimulatedAsset, simTime: string) {
  const now = new Date(simTime).getTime();
  return asset.catalysts.filter(
    (c) => new Date(c.scheduledAt).getTime() <= now
  );
}

export function advanceSimulation(
  state: SimulationState,
  ticks: number,
  cycleSeed?: string
): SimulationState {
  let simTime = state.simTime;
  let assets = state.assets.map((a) => ({ ...a, catalysts: [...a.catalysts] }));

  for (let i = 0; i < ticks; i++) {
    simTime = advanceSimTime(simTime, 1);
    const tickIndex = state.tickCount + i + 1;

    assets = assets.map((asset) => {
      pruneSandboxEvents(asset, simTime);

      const due = getDueCatalysts(asset, simTime);
      for (const catalyst of due) {
        asset = resolveDueCatalyst(
          asset,
          catalyst,
          simTime,
          `${cycleSeed ?? "sim"}-${asset.slug}-${catalyst.id}-${simTime}`
        );
      }

      return runSandboxTick(asset, { simTime, tickIndex, simulateDemand: true });
    });
  }

  return {
    ...state,
    simTime,
    tickCount: state.tickCount + ticks,
    assets: trimHistory(assets),
  };
}

export function triggerSampleEvent(
  state: SimulationState,
  event: SampleEventDefinition
): SimulationState {
  const assets = state.assets.map((asset) => {
    if (asset.slug !== event.slug) return asset;

    const { asset: updated } = applyExpectationEvent(asset, {
      title: event.title,
      source: event.source,
      eventKind: event.eventKind,
      occurredAt: state.simTime,
      expectedImpact: event.expectedImpact,
      actualImpact: event.actualImpact,
    });

    return runSandboxTick(updated, {
      simTime: state.simTime,
      tickIndex: state.tickCount,
      simulateDemand: true,
    });
  });

  return {
    ...state,
    assets: trimHistory(assets),
  };
}

export function setSelectedAsset(
  state: SimulationState,
  slug: string
): SimulationState {
  return { ...state, selectedSlug: slug };
}

export function resetSimulation(): SimulationState {
  return createInitialSimulation();
}

/** Expectation vs reality demo scenarios */
export const SAMPLE_EVENTS: SampleEventDefinition[] = [
  {
    id: "taylor-album-miss",
    slug: "taylor-swift",
    label: "Taylor album — only okay",
    title: "Album release — reception lands soft",
    expectedImpact: 5,
    actualImpact: 3,
    source: "taylorswift.com",
    eventKind: "album",
    scenarioNote: "Huge hype priced in → disappointment",
  },
  {
    id: "messi-blank",
    slug: "lionel-messi",
    label: "Messi blanks (expected goals)",
    title: "UCL match — expected to score, blanked",
    expectedImpact: 4,
    actualImpact: 1,
    source: "UEFA.com",
    eventKind: "brace",
    scenarioNote: "Goal expected → no goals",
  },
  {
    id: "dune-trailer-beat",
    slug: "dune",
    label: "Dune trailer — huge reception",
    title: "Teaser trailer — viral breakout",
    expectedImpact: 3,
    actualImpact: 5,
    source: "warnerbros.com",
    eventKind: "trailer",
    scenarioNote: "Moderate buzz expected → smash hit",
  },
  {
    id: "netflix-premiere-miss",
    slug: "netflix",
    label: "Netflix premiere — underperforms",
    title: "Glass Harbor premiere — weak debut",
    expectedImpact: 4,
    actualImpact: 2,
    source: "netflix.com",
    eventKind: "premiere",
    scenarioNote: "Hit expected → underwhelming",
  },
  {
    id: "liverpool-loss",
    slug: "liverpool-fc",
    label: "Liverpool loss (win expected)",
    title: "Title-race fixture — shock defeat",
    expectedImpact: 4,
    actualImpact: 1,
    source: "premierleague.com",
    eventKind: "title",
    scenarioNote: "Win expected → loss",
  },
  {
    id: "taylor-album-beat",
    slug: "taylor-swift",
    label: "Taylor album — exceeds hype",
    title: "Album release — exceeds expectations",
    expectedImpact: 5,
    actualImpact: 5,
    source: "taylorswift.com",
    eventKind: "album",
    scenarioNote: "Meets sky-high bar",
  },
  {
    id: "messi-brace",
    slug: "lionel-messi",
    label: "Messi scores 2 goals",
    title: "Brace in UCL quarter-final",
    expectedImpact: 4,
    actualImpact: 4.5,
    source: "UEFA.com",
    eventKind: "brace",
    scenarioNote: "Delivers as expected",
  },
  {
    id: "zendaya-award",
    slug: "zendaya",
    label: "Zendaya award win",
    title: "Cannes Best Actress win",
    expectedImpact: 4,
    actualImpact: 4,
    source: "festival-cannes.com",
    eventKind: "award",
    scenarioNote: "Meets expectations",
  },
];
