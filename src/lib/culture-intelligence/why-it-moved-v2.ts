import type { PriceImpactLane, PriceV2Input } from "@/lib/culture-intelligence/price-v2";

export interface MovementTraceEntry {
  signal:
    | "culture_event"
    | "expectation"
    | "attention"
    | "surprise"
    | "momentum"
    | "viral"
    | "price_change";
  label: string;
  value: string;
  interpretation: string;
}

export interface MovementExplanation {
  short: string;
  detailed: string;
  trace: MovementTraceEntry[];
}

const signed = (value: number, places = 1) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(places)}`;

export function generateMovementExplanation(params: {
  input: PriceV2Input;
  changePercent: number;
  simulatedPrice: number;
  lanes: PriceImpactLane[];
}): MovementExplanation {
  const { input, changePercent, simulatedPrice, lanes } = params;
  const direction = changePercent > 0 ? "rose" : changePercent < 0 ? "fell" : "held steady";
  const outcome = input.surpriseDelta > 0
    ? "beat expectations"
    : input.surpriseDelta < 0
      ? "missed expectations"
      : "matched expectations";
  const momentum = input.momentumScore >= 65
    ? "strong momentum"
    : input.momentumScore < 40
      ? "weak momentum"
      : "moderate momentum";
  const viral = input.viralMultiplier > 1.25
    ? "amplified by viral reach"
    : input.viralMultiplier < 0.9
      ? "limited by weak viral follow-through"
      : "with normal viral follow-through";

  const short = `${input.assetName} ${direction} ${Math.abs(changePercent).toFixed(2)}% in the v2 simulation after “${input.cultureEventTitle}” ${outcome}, with ${momentum} ${viral}.`;

  const laneBreakdown = lanes
    .map((lane) => `${lane.label} contributed ${signed(lane.impactPercent, 2)}%`)
    .join("; ");
  const detailed = [
    `CultureEvent: “${input.cultureEventTitle}” affected ${input.assetName}.`,
    `Expectation was ${input.expectationScore.toFixed(1)}/100, with expected attention ${input.expectedAttention.toFixed(1)}/100.`,
    `Observed attention was ${input.actualAttention.toFixed(1)}/5, producing a surprise delta of ${signed(input.surpriseDelta, 2)}.`,
    `Momentum resolved at ${input.momentumScore.toFixed(1)}/100 and the viral multiplier at ${input.viralMultiplier.toFixed(2)}×.`,
    `${laneBreakdown}.`,
    `After applying the configured movement cap, the sandbox price moved from ${input.oldPrice.toFixed(2)} to ${simulatedPrice.toFixed(2)} (${signed(changePercent, 2)}%).`,
  ].join(" ");

  const trace: MovementTraceEntry[] = [
    {
      signal: "culture_event",
      label: "Triggering CultureEvent",
      value: input.cultureEventId,
      interpretation: input.cultureEventTitle,
    },
    {
      signal: "expectation",
      label: "Expectation inputs",
      value: `${input.expectationScore.toFixed(1)}/100; expected attention ${input.expectedAttention.toFixed(1)}/100`,
      interpretation: "Established the market expectation baseline before resolution.",
    },
    {
      signal: "attention",
      label: "Actual attention",
      value: `${input.actualAttention.toFixed(1)}/5`,
      interpretation: "Observed cultural attention used to resolve the event.",
    },
    {
      signal: "surprise",
      label: "Surprise delta",
      value: signed(input.surpriseDelta, 2),
      interpretation: outcome,
    },
    {
      signal: "momentum",
      label: "Momentum score",
      value: `${input.momentumScore.toFixed(1)}/100`,
      interpretation: momentum,
    },
    {
      signal: "viral",
      label: "Viral multiplier",
      value: `${input.viralMultiplier.toFixed(2)}×`,
      interpretation: viral,
    },
    {
      signal: "price_change",
      label: "Simulated price change",
      value: `${signed(changePercent, 2)}%`,
      interpretation: laneBreakdown,
    },
  ];

  return { short, detailed, trace };
}
