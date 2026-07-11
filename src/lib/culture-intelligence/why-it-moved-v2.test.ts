import assert from "node:assert/strict";
import test from "node:test";
import { simulatePriceV2, type PriceV2Input } from "./price-v2";
import { generateMovementExplanation } from "./why-it-moved-v2";

const input: PriceV2Input = {
  assetSlug: "dune",
  assetName: "Dune",
  cultureEventId: "11111111-1111-4111-8111-111111111111",
  cultureEventTitle: "Trailer exceeds forecasts",
  oldPrice: 120,
  expectationScore: 72,
  expectedAttention: 65,
  actualAttention: 5,
  surpriseDelta: 1.75,
  momentumScore: 84,
  viralMultiplier: 1.9,
  simulatedAt: "2026-07-11T12:00:00.000Z",
};

test("every simulation includes short, detailed, and structured explanations", () => {
  const simulation = simulatePriceV2(input);
  assert.ok(simulation.shortExplanation.length > 20);
  assert.ok(simulation.detailedExplanation.length > simulation.shortExplanation.length);
  assert.equal(simulation.explanationTrace.length, 7);
});

test("short explanation is one sentence", () => {
  const simulation = simulatePriceV2(input);
  const sentenceEndings = simulation.shortExplanation.match(/[.!?](?:$|\s)/g) ?? [];
  assert.equal(sentenceEndings.length, 1);
});

test("detailed explanation includes every required signal", () => {
  const simulation = simulatePriceV2(input);
  const detail = simulation.detailedExplanation;
  assert.match(detail, /Trailer exceeds forecasts/);
  assert.match(detail, /72\.0\/100/);
  assert.match(detail, /65\.0\/100/);
  assert.match(detail, /5\.0\/5/);
  assert.match(detail, /\+1\.75/);
  assert.match(detail, /84\.0\/100/);
  assert.match(detail, /1\.90×/);
  assert.match(detail, /sandbox price moved/);
});

test("negative surprise creates a traceable disappointment explanation", () => {
  const simulation = simulatePriceV2({
    ...input,
    actualAttention: 1.5,
    surpriseDelta: -2,
    momentumScore: 30,
    viralMultiplier: 0.7,
  });
  assert.match(simulation.shortExplanation, /missed expectations/);
  assert.match(simulation.shortExplanation, /fell/);
  assert.match(simulation.detailedExplanation, /-2\.00/);
});

test("standalone service uses the supplied simulated change and lanes", () => {
  const explanation = generateMovementExplanation({
    input,
    changePercent: 2.5,
    simulatedPrice: 123,
    lanes: [{ key: "surprise", label: "Attention beat expectations", impactPercent: 2.5 }],
  });
  assert.match(explanation.short, /2\.50%/);
  assert.match(explanation.detailed, /120\.00 to 123\.00/);
  assert.match(explanation.trace.at(-1)?.interpretation ?? "", /\+2\.50%/);
});
