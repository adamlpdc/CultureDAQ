import { createClient } from "@supabase/supabase-js";
import { existsSync, statSync } from "node:fs";
import { buildMarketRebalancePlan } from "../src/lib/market-rebalance";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase admin credentials");

const apply = process.argv.includes("--apply");
const confirmation = process.argv.find((arg) => arg.startsWith("--confirm="))?.split("=")[1];
const backupPath = process.argv.find((arg) => arg.startsWith("--backup="))?.split("=")[1];
if (apply && process.env.FEATURE_MARKET_REBALANCE !== "true") {
  throw new Error("FEATURE_MARKET_REBALANCE must be true before applying");
}
if (apply && confirmation !== "MARKET_AND_PLAYER_RESET_V1") {
  throw new Error("Applying requires --confirm=MARKET_AND_PLAYER_RESET_V1");
}
if (
  apply &&
  (!backupPath || !existsSync(backupPath) || statSync(backupPath).size < 1_000_000)
) {
  throw new Error("Applying requires --backup=/path/to/a verified full pg_dump backup");
}

async function main() {
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase
  .from("assets")
  .select("id, slug, name, current_price, previous_price, total_shares_outstanding");
if (error) throw error;

const plan = buildMarketRebalancePlan((data ?? []).map((asset) => ({
  id: asset.id,
  slug: asset.slug,
  name: asset.name,
  currentPrice: Number(asset.current_price),
  previousPrice: Number(asset.previous_price),
  totalSharesOutstanding: Number(asset.total_shares_outstanding),
})));

console.table(plan.assets.map((asset) => ({
  Rank: asset.oldRank,
  Asset: asset.name,
  Old: asset.currentPrice,
  New: asset.newPrice,
  Tier: asset.tier,
  ValueDrift: asset.valueDrift,
})));
console.log({
  rankingsPreserved: plan.rankingsPreserved,
  oldRange: [plan.oldMinPrice, plan.oldMaxPrice],
  newRange: [plan.newMinPrice, plan.newMaxPrice],
  maximumValueDrift: plan.maximumValueDrift,
  mode: apply ? "APPLY" : "PREVIEW ONLY",
});

if (apply) {
  const payload = {
    assets: plan.assets.map((asset) => ({
      asset_id: asset.id,
      old_price: asset.currentPrice,
      new_price: asset.newPrice,
      old_previous_price: asset.previousPrice,
      new_previous_price: asset.newPreviousPrice,
      old_total_shares: asset.totalSharesOutstanding,
      new_total_shares: asset.newTotalSharesOutstanding,
      price_factor: asset.priceFactor,
      old_rank: asset.oldRank,
      new_rank: asset.newRank,
    })),
  };
  const { data: runIds, error: applyError } = await supabase.rpc("apply_market_and_player_reset", {
    p_plan: payload,
    p_confirmation: confirmation,
    p_note: "Market Reset v1.0 and one-time full player reset",
  });
  if (applyError) throw applyError;
  console.log(`Applied combined reset ${JSON.stringify(runIds)}; market remains paused pending validation.`);
}
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
