import { createClient } from "@supabase/supabase-js";
import { buildMarketRebalancePlan } from "../src/lib/market-rebalance";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase admin credentials");

async function main() {
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const [{ data: assets, error: assetError }, { data: profiles, error: profileError }, { data: holdings, error: holdingError }] =
  await Promise.all([
    supabase.from("assets").select("id, slug, name, current_price, previous_price, total_shares_outstanding"),
    supabase.from("profiles").select("user_id, username, daq_balance"),
    supabase.from("holdings").select("user_id, asset_id, shares, avg_cost"),
  ]);
if (assetError) throw assetError;
if (profileError) throw profileError;
if (holdingError) throw holdingError;

const plan = buildMarketRebalancePlan((assets ?? []).map((asset) => ({
  id: asset.id,
  slug: asset.slug,
  name: asset.name,
  currentPrice: Number(asset.current_price),
  previousPrice: Number(asset.previous_price),
  totalSharesOutstanding: Number(asset.total_shares_outstanding),
})));
const plans = new Map(plan.assets.map((asset) => [asset.id, asset]));

const portfolioRows = (profiles ?? []).map((profile) => {
  let beforeHoldings = 0;
  let afterHoldings = 0;
  let maxReturnDrift = 0;
  for (const holding of (holdings ?? []).filter((item) => item.user_id === profile.user_id)) {
    const asset = plans.get(holding.asset_id);
    if (!asset) throw new Error(`Holding references missing asset ${holding.asset_id}`);
    const shares = Number(holding.shares);
    const averageCost = Number(holding.avg_cost);
    const adjustedShares = shares / asset.priceFactor;
    const adjustedAverageCost = averageCost * asset.priceFactor;
    beforeHoldings += shares * asset.currentPrice;
    afterHoldings += adjustedShares * asset.newPrice;
    if (averageCost > 0) {
      const beforeReturn = (asset.currentPrice - averageCost) / averageCost;
      const afterReturn = (asset.newPrice - adjustedAverageCost) / adjustedAverageCost;
      maxReturnDrift = Math.max(maxReturnDrift, Math.abs(afterReturn - beforeReturn));
    }
  }
  const cash = Number(profile.daq_balance);
  return {
    userId: profile.user_id,
    username: profile.username,
    before: cash + beforeHoldings,
    after: cash + afterHoldings,
    holdingsBefore: beforeHoldings,
    holdingsAfter: afterHoldings,
    maxReturnDrift,
  };
});

const beforeRanks = [...portfolioRows].sort((a, b) => b.before - a.before || a.userId.localeCompare(b.userId));
const afterRanks = [...portfolioRows].sort((a, b) => b.after - a.after || a.userId.localeCompare(b.userId));
const afterRank = new Map(afterRanks.map((row, index) => [row.userId, index + 1]));
const top100 = beforeRanks.slice(0, 100).map((row, index) => ({
  ...row,
  rankBefore: index + 1,
  rankAfter: afterRank.get(row.userId)!,
  discrepancy: row.after - row.before,
}));

const critical = [
  ...plan.assets.filter((asset) => asset.oldRank !== asset.newRank).map((asset) => `Asset rank: ${asset.slug}`),
  ...top100.filter((row) => row.rankBefore !== row.rankAfter).map((row) => `Player rank: ${row.username}`),
  ...top100.filter((row) => Math.abs(row.discrepancy) > 0.005).map((row) => `Portfolio value: ${row.username}`),
  ...top100.filter((row) => row.maxReturnDrift > 1e-8).map((row) => `Return percentage: ${row.username}`),
];

console.log("# Market Reset v1.0 Live-Data Dry-Run Validation\n");
console.log(`Assets: ${plan.assets.length}`);
console.log(`Players checked: ${top100.length}`);
console.log(`Rankings preserved: ${plan.rankingsPreserved}`);
console.log(`Critical issues: ${critical.length}`);
console.log(`Maximum portfolio discrepancy: ${Math.max(0, ...top100.map((row) => Math.abs(row.discrepancy)))}`);
console.log(`Maximum percentage-return drift: ${Math.max(0, ...top100.map((row) => row.maxReturnDrift))}\n`);

console.log("## Top 20 assets\n");
console.log("|Before rank|After rank|Asset|Before|After|");
console.log("|---:|---:|---|---:|---:|");
for (const asset of plan.assets.slice(0, 20)) {
  console.log(`|${asset.oldRank}|${asset.newRank}|${asset.name}|${asset.currentPrice}|${asset.newPrice}|`);
}
console.log("\n## Top 100 portfolios\n");
console.log("|Before rank|After rank|Player|Before|After|Discrepancy|");
console.log("|---:|---:|---|---:|---:|---:|");
for (const row of top100) {
  console.log(`|${row.rankBefore}|${row.rankAfter}|${row.username}|${row.before.toFixed(2)}|${row.after.toFixed(2)}|${row.discrepancy.toFixed(8)}|`);
}
console.log("\n## Discrepancies\n");
if (critical.length === 0) console.log("None in dry-run calculation.");
else critical.forEach((issue) => console.log(`- ${issue}`));

if (critical.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
