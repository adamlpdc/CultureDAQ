export interface PriceV2Input {
  assetSlug: string;
  assetName: string;
  cultureEventId: string;
  cultureEventTitle: string;
  oldPrice: number;
  expectationScore: number;
  expectedAttention: number;
  actualAttention: number;
  surpriseDelta: number;
  momentumScore: number;
  viralMultiplier: number;
  simulatedAt?: string;
}

export interface PriceImpactLane {
  key: "surprise" | "momentum" | "expectation_gap" | "viral";
  label: string;
  impactPercent: number;
}

export interface MarketSimulation {
  id?: string;
  assetSlug: string;
  assetName: string;
  oldPrice: number;
  simulatedPrice: number;
  changePercent: number;
  priceImpact: number;
  cultureEventId: string;
  cultureEventTitle: string;
  reason: string;
  shortExplanation: string;
  detailedExplanation: string;
  explanationTrace: MovementTraceEntry[];
  lanes: PriceImpactLane[];
  simulatedAt: string;
}

export interface PriceV2Config {
  maxChangePercent: number;
  minPrice: number;
  surpriseMultiplier: number;
  momentumMultiplier: number;
  viralMultiplier: number;
}

export const DEFAULT_PRICE_V2_CONFIG: PriceV2Config = {
  maxChangePercent: 12,
  minPrice: 0.01,
  surpriseMultiplier: 1.4,
  momentumMultiplier: 2,
  viralMultiplier: 1,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round = (value: number, places = 4) => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};

export function getPriceV2ConfigFromEnv(): PriceV2Config {
  const parsed = Number(process.env.PRICE_V2_MAX_CHANGE_PERCENT);
  return {
    ...DEFAULT_PRICE_V2_CONFIG,
    maxChangePercent: Number.isFinite(parsed) && parsed > 0
      ? Math.min(parsed, 25)
      : DEFAULT_PRICE_V2_CONFIG.maxChangePercent,
  };
}

/** Pure sandbox calculator. It returns a simulation and never persists or updates an asset. */
export function simulatePriceV2(
  input: PriceV2Input,
  config: PriceV2Config = DEFAULT_PRICE_V2_CONFIG
): MarketSimulation {
  if (input.oldPrice <= 0) throw new Error("Old price must be greater than zero");
  if (input.actualAttention < 1 || input.actualAttention > 5) {
    throw new Error("Actual attention must be between 1 and 5");
  }

  const expectationOnFive = clamp(
    (input.expectationScore + input.expectedAttention) / 40,
    1,
    5
  );
  const rawLanes: PriceImpactLane[] = [
    {
      key: "surprise",
      label: input.surpriseDelta >= 0 ? "Attention beat expectations" : "Attention missed expectations",
      impactPercent:
        input.surpriseDelta * config.surpriseMultiplier *
        (1 + (input.viralMultiplier - 1) * config.viralMultiplier),
    },
    {
      key: "momentum",
      label: input.momentumScore >= 50 ? "Positive cultural momentum" : "Weak cultural momentum",
      impactPercent: ((input.momentumScore - 50) / 50) * config.momentumMultiplier,
    },
    {
      key: "expectation_gap",
      label: input.actualAttention >= expectationOnFive
        ? "Actual attention supports the expectation premium"
        : "Expectation premium is unwinding",
      impactPercent: (input.actualAttention - expectationOnFive) * 0.65,
    },
    {
      key: "viral",
      label: input.viralMultiplier >= 1 ? "Viral amplification" : "Limited viral follow-through",
      impactPercent: (input.viralMultiplier - 1) * 1.5 * config.viralMultiplier,
    },
  ];
  const lanes: PriceImpactLane[] = rawLanes.map((lane) => ({
    ...lane,
    impactPercent: round(lane.impactPercent, 3),
  }));

  const rawChange = lanes.reduce((sum, lane) => sum + lane.impactPercent, 0);
  const changePercent = clamp(rawChange, -config.maxChangePercent, config.maxChangePercent);
  const simulatedPrice = Math.max(
    config.minPrice,
    input.oldPrice * (1 + changePercent / 100)
  );
  const priceImpact = simulatedPrice - input.oldPrice;
  const primaryLane = [...lanes].sort(
    (a, b) => Math.abs(b.impactPercent) - Math.abs(a.impactPercent)
  )[0];
  const explanation = generateMovementExplanation({
    input,
    changePercent: round(changePercent, 2),
    simulatedPrice: round(simulatedPrice),
    lanes,
  });

  return {
    assetSlug: input.assetSlug,
    assetName: input.assetName,
    oldPrice: round(input.oldPrice),
    simulatedPrice: round(simulatedPrice),
    changePercent: round(changePercent, 2),
    priceImpact: round(priceImpact),
    cultureEventId: input.cultureEventId,
    cultureEventTitle: input.cultureEventTitle,
    reason: primaryLane?.label ?? "No material Culture Intelligence signal",
    shortExplanation: explanation.short,
    detailedExplanation: explanation.detailed,
    explanationTrace: explanation.trace,
    lanes,
    simulatedAt: input.simulatedAt ?? new Date().toISOString(),
  };
}
import { generateMovementExplanation, type MovementTraceEntry } from "@/lib/culture-intelligence/why-it-moved-v2";
