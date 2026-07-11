import type { SimulatedAsset } from "@/lib/attention/types";

function daysFrom(simTime: string, days: number): string {
  return new Date(
    new Date(simTime).getTime() + days * 24 * 60 * 60 * 1000
  ).toISOString();
}

function seedAsset(
  slug: string,
  name: string,
  category: SimulatedAsset["category"],
  currentPrice: number,
  baselineRelevance: number,
  attentionScore: number,
  expectationScore: number,
  volatility: number,
  simTime: string,
  catalysts: SimulatedAsset["catalysts"] = []
): SimulatedAsset {
  return {
    slug,
    name,
    category,
    currentPrice,
    baselineRelevance,
    attentionScore,
    expectationScore,
    attentionHalfLife: 72,
    attentionAcceleration: 0,
    fairValueAnchor: currentPrice,
    lastVerifiedEventAt: null,
    pendingImpulse: null,
    volatility,
    momentumScore: 0,
    buyPressure: 0,
    sellPressure: 0,
    activeEvents: [],
    catalysts,
    recentOutcomes: [],
    history: [
      {
        simTime,
        price: currentPrice,
        attentionScore,
        changePercent: 0,
      },
    ],
    lastTick: null,
  };
}

export function createInitialAssets(simTime: string): SimulatedAsset[] {
  return [
    seedAsset(
      "lionel-messi",
      "Lionel Messi",
      "athletes",
      445,
      78,
      80,
      72,
      1.0,
      simTime,
      [
        {
          id: "messi-ucl",
          title: "UCL quarter-final — goal expected",
          scheduledAt: daysFrom(simTime, 3),
          expectedImpact: 4,
          eventKind: "brace",
          source: "UEFA.com",
        },
      ]
    ),
    seedAsset(
      "taylor-swift",
      "Taylor Swift",
      "musicians",
      485,
      72,
      74,
      88,
      1.0,
      simTime,
      [
        {
          id: "taylor-album-catalyst",
          title: "Album release — blockbuster expected",
          scheduledAt: daysFrom(simTime, 7),
          expectedImpact: 5,
          eventKind: "album",
          source: "taylorswift.com",
        },
      ]
    ),
    seedAsset(
      "zendaya",
      "Zendaya",
      "actors",
      312.75,
      45,
      44,
      40,
      1.1,
      simTime,
      [
        {
          id: "zendaya-cannes",
          title: "Cannes Film Festival ceremony",
          scheduledAt: daysFrom(simTime, 14),
          expectedImpact: 4,
          eventKind: "award",
          source: "festival-cannes.com",
        },
      ]
    ),
    seedAsset(
      "dune",
      "Dune",
      "movies",
      312.25,
      32,
      30,
      38,
      1.1,
      simTime,
      [
        {
          id: "dune-trailer-catalyst",
          title: "Official teaser trailer — moderate buzz expected",
          scheduledAt: daysFrom(simTime, 10),
          expectedImpact: 3,
          eventKind: "trailer",
          source: "warnerbros.com",
        },
      ]
    ),
    seedAsset(
      "netflix",
      "Netflix",
      "brands",
      334.25,
      52,
      48,
      76,
      1.1,
      simTime,
      [
        {
          id: "netflix-premiere-catalyst",
          title: "Glass Harbor S1 premiere — hit expected",
          scheduledAt: daysFrom(simTime, 5),
          expectedImpact: 4,
          eventKind: "premiere",
          source: "netflix.com",
        },
      ]
    ),
    seedAsset(
      "liverpool-fc",
      "Liverpool FC",
      "sports_teams",
      334,
      58,
      55,
      70,
      1.1,
      simTime,
      [
        {
          id: "liverpool-title-race",
          title: "Decisive title-race fixture — win expected",
          scheduledAt: daysFrom(simTime, 4),
          expectedImpact: 4,
          eventKind: "title",
          source: "premierleague.com",
        },
      ]
    ),
    seedAsset(
      "nike",
      "Nike",
      "brands",
      412,
      55,
      52,
      48,
      0.9,
      simTime,
      [
        {
          id: "nike-boot-launch",
          title: "Signature athlete boot global launch",
          scheduledAt: daysFrom(simTime, 12),
          expectedImpact: 4,
          eventKind: "product",
          source: "nike.com",
        },
      ]
    ),
    seedAsset(
      "mrbeast",
      "MrBeast",
      "influencers",
      389,
      48,
      46,
      42,
      1.3,
      simTime,
      [
        {
          id: "mrbeast-doc-catalyst",
          title: "100M-subscriber documentary announcement",
          scheduledAt: daysFrom(simTime, 6),
          expectedImpact: 3,
          eventKind: "documentary",
          source: "youtube.com",
        },
      ]
    ),
  ];
}
