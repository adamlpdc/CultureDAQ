import { TICKS_PER_DAY } from "@/lib/attention/constants";
import { createInitialAssets } from "@/lib/attention/sample-assets";
import { advanceSimulation } from "@/lib/attention/simulation";
import type { SimulationState } from "@/lib/attention/types";

const CYCLES = 100;
const DAYS = 30;

function stdDev(nums: number[]) {
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Math.sqrt(nums.reduce((s, x) => s + (x - mean) ** 2, 0) / (nums.length - 1));
}

function avg(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

const slugs = [
  "lionel-messi",
  "taylor-swift",
  "zendaya",
  "dune",
  "netflix",
  "liverpool-fc",
  "nike",
  "mrbeast",
];

const assetStats = new Map<
  string,
  { name: string; category: string; returns: number[]; wins: number; tops: number }
>();
const catReturns = new Map<string, number[]>();
const index: number[] = [];
const calendar: number[] = [];
const peakChaser: number[] = [];
const bestOracle: number[] = [];
const worstOracle: number[] = [];
let calendarBeats = 0;
let peakChaserLoses = 0;

for (let i = 0; i < CYCLES; i++) {
  const baseIso = new Date(Date.UTC(2026, 0, 1, 12, 0, 0) + i * 41 * 3600000).toISOString();
  let state: SimulationState = {
    simTime: baseIso,
    startedAt: baseIso,
    tickCount: 0,
    assets: createInitialAssets(baseIso),
    selectedSlug: "taylor-swift",
  };

  const startPrices = Object.fromEntries(state.assets.map((a) => [a.slug, a.currentPrice]));
  const dailyPrices: Record<string, number[]> = {};
  const day7Attention: Record<string, number> = {};
  const catalystDefs = state.assets.map((a) => ({
    slug: a.slug,
    catalysts: a.catalysts.map((c) => ({ ...c })),
  }));

  for (const s of slugs) dailyPrices[s] = [startPrices[s]];

  for (let day = 0; day < DAYS; day++) {
    state = advanceSimulation(state, TICKS_PER_DAY, `mc-${i}`);
    for (const a of state.assets) {
      dailyPrices[a.slug].push(a.currentPrice);
      if (a.history.length > TICKS_PER_DAY * 4) a.history = a.history.slice(-TICKS_PER_DAY * 4);
      if (day === 6) day7Attention[a.slug] = a.attentionScore;
    }
  }

  const endReturns = Object.fromEntries(
    state.assets.map((a) => [
      a.slug,
      ((a.currentPrice - startPrices[a.slug]) / startPrices[a.slug]) * 100,
    ])
  );

  const ranked = slugs.map((s) => ({ slug: s, ret: endReturns[s] })).sort((a, b) => b.ret - a.ret);
  const idx = avg(ranked.map((r) => r.ret));
  index.push(idx);
  bestOracle.push(ranked[0].ret);
  worstOracle.push(ranked[ranked.length - 1].ret);

  for (const r of ranked) {
    const a = state.assets.find((x) => x.slug === r.slug)!;
    if (!assetStats.has(r.slug)) {
      assetStats.set(r.slug, {
        name: a.name,
        category: a.category,
        returns: [],
        wins: 0,
        tops: 0,
      });
    }
    const st = assetStats.get(r.slug)!;
    st.returns.push(r.ret);
    if (r.ret > 0) st.wins++;
    if (r.slug === ranked[0].slug) st.tops++;
    if (!catReturns.has(st.category)) catReturns.set(st.category, []);
    catReturns.get(st.category)!.push(r.ret);
  }

  let calSum = 0;
  let calN = 0;
  for (const { slug, catalysts } of catalystDefs) {
    for (const c of catalysts) {
      const day = Math.round(
        (new Date(c.scheduledAt).getTime() - new Date(baseIso).getTime()) / 86400000
      );
      if (day < 0 || day > DAYS) continue;
      const buyP = dailyPrices[slug][Math.max(0, day - 2)] ?? startPrices[slug];
      const sellP = dailyPrices[slug][Math.min(day, dailyPrices[slug].length - 1)];
      calSum += ((sellP - buyP) / buyP) * 100;
      calN++;
    }
  }
  const cal = calN > 0 ? calSum / calN : idx;
  calendar.push(cal);
  if (cal > idx) calendarBeats++;

  const hotSlug = slugs.reduce((best, s) =>
    (day7Attention[s] ?? 0) > (day7Attention[best] ?? 0) ? s : best
  );
  const peakBuyPrice =
    dailyPrices[hotSlug][7] ?? dailyPrices[hotSlug][dailyPrices[hotSlug].length - 1];
  const peakSellPrice = dailyPrices[hotSlug][dailyPrices[hotSlug].length - 1];
  const peakReturn = ((peakSellPrice - peakBuyPrice) / peakBuyPrice) * 100;
  peakChaser.push(peakReturn);
  if (peakReturn < idx) peakChaserLoses++;

  if ((i + 1) % 25 === 0) process.stderr.write(`  ${i + 1}/${CYCLES}\n`);
}

const assets = [...assetStats.values()].sort((a, b) => avg(b.returns) - avg(a.returns));
const negativeOutcomes = assets.reduce((sum, a) => sum + (CYCLES - a.wins), 0);
const negativeOutcomePct = (negativeOutcomes / (CYCLES * assets.length)) * 100;

console.log("\n=== EXPECTATION vs REALITY — 100 x 30-day cycles ===\n");

console.log("ASSET RETURNS:");
console.table(
  assets.map((a) => ({
    Asset: a.name,
    Avg: +avg(a.returns).toFixed(2),
    Min: +Math.min(...a.returns).toFixed(2),
    Max: +Math.max(...a.returns).toFixed(2),
    WinPct: +((a.wins / CYCLES) * 100).toFixed(0),
    LosePct: +(((CYCLES - a.wins) / CYCLES) * 100).toFixed(0),
    TopPct: +((a.tops / CYCLES) * 100).toFixed(0),
  }))
);

const dune = assets.find((a) => a.name === "Dune");
console.log(`\nAsset-cycle negative outcomes: ${negativeOutcomePct.toFixed(1)}% (target 20–35%)`);
console.log(`Assets that sometimes lose: ${assets.filter((a) => a.wins < CYCLES).length}/8`);
console.log(`Dune #1 finish rate: ${dune?.tops ?? 0}/100`);

console.log("\nPLAYER STRATEGIES:");
console.table([
  { Strategy: "Equal-weight index", Avg: +avg(index).toFixed(2), Std: +stdDev(index).toFixed(2) },
  {
    Strategy: "Calendar catalyst trader",
    Avg: +avg(calendar).toFixed(2),
    Std: +stdDev(calendar).toFixed(2),
    Edge: +(avg(calendar) - avg(index)).toFixed(2),
  },
  {
    Strategy: "Peak chaser (day-7 hottest)",
    Avg: +avg(peakChaser).toFixed(2),
    Std: +stdDev(peakChaser).toFixed(2),
  },
  { Strategy: "Best oracle", Avg: +avg(bestOracle).toFixed(2) },
  { Strategy: "Worst oracle", Avg: +avg(worstOracle).toFixed(2) },
]);

console.log(`\nCalendar beats index: ${calendarBeats}/100 cycles`);
console.log(`Peak chaser underperforms index: ${peakChaserLoses}/100 cycles`);

console.log("\nCATEGORIES:");
console.table(
  [...catReturns.entries()]
    .sort((a, b) => avg(b[1]) - avg(a[1]))
    .map(([cat, rets]) => ({
      Category: cat,
      Avg: +avg(rets).toFixed(2),
      LosePct: +((rets.filter((r) => r <= 0).length / rets.length) * 100).toFixed(0),
    }))
);

console.log("\nTARGET CHECK:");
console.log(
  `Index in +3% to +8% range: ${avg(index) >= 3 && avg(index) <= 8 ? "PASS" : "FAIL"} (actual ${avg(index).toFixed(2)}%)`
);
console.log(
  `Negative outcomes 20–35%: ${negativeOutcomePct >= 20 && negativeOutcomePct <= 35 ? "PASS" : "FAIL"} (${negativeOutcomePct.toFixed(1)}%)`
);
console.log(`No asset 100/100 positive: ${assets.every((a) => a.wins < CYCLES) ? "PASS" : "FAIL"}`);
console.log(`Dune not 100/100: ${(dune?.tops ?? 0) < 100 ? "PASS" : "FAIL"}`);
console.log(`Calendar beats index: ${calendarBeats > 50 ? "PASS" : "FAIL"} (${calendarBeats}/100)`);
console.log(
  `Peak chaser loses often: ${peakChaserLoses > 50 ? "PASS" : "FAIL"} (${peakChaserLoses}/100)`
);
