import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase admin credentials");

async function main() {
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: run, error: runError } = await supabase
  .from("market_rebalance_runs")
  .select("*")
  .eq("status", "applied")
  .order("applied_at", { ascending: false })
  .limit(1)
  .single();
if (runError) throw runError;

const [
  { data: assets, error: assetError },
  { data: portfolios, error: portfolioError },
  { data: control },
  { data: playerRun, error: playerRunError },
  { data: playerAudit, error: playerAuditError },
  { data: profiles },
  { count: holdingCount },
  { count: tradeCount },
] =
  await Promise.all([
    supabase.from("market_rebalance_assets").select("*, asset:assets(name)").eq("run_id", run.id).order("old_rank").limit(20),
    supabase.from("market_rebalance_portfolio_audit").select("*").eq("run_id", run.id).order("rank_before").limit(100),
    supabase.from("market_engine_controls").select("paused, pause_reason").eq("id", "production").single(),
    supabase.from("player_reset_runs").select("*").eq("status", "applied").order("applied_at", { ascending: false }).limit(1).single(),
    supabase.from("player_reset_audit").select("*").order("reset_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("user_id, username, daq_balance"),
    supabase.from("holdings").select("*", { count: "exact", head: true }),
    supabase.from("trades").select("*", { count: "exact", head: true }),
  ]);
if (assetError) throw assetError;
if (portfolioError) throw portfolioError;
if (playerRunError) throw playerRunError;
if (playerAuditError) throw playerAuditError;

const critical: string[] = [];
for (const asset of assets ?? []) {
  if (asset.old_rank !== asset.new_rank) critical.push(`Asset rank changed: ${asset.asset_id}`);
}
for (const portfolio of portfolios ?? []) {
  if (portfolio.rank_before !== portfolio.rank_after) {
    critical.push(`Portfolio rank changed: ${portfolio.username}`);
  }
}
if (run.achievement_count_before !== run.achievement_count_after) {
  critical.push("Unlocked achievement count changed");
}
if (!control?.paused) critical.push("Market engine resumed before validation");
if ((profiles ?? []).some((profile) => Number(profile.daq_balance) !== 100_000)) {
  critical.push("One or more players do not have exactly 100,000 DAQ cash");
}
if ((holdingCount ?? 0) !== 0) critical.push(`Holdings remain: ${holdingCount}`);
if ((tradeCount ?? 0) !== 0) critical.push(`Trades remain: ${tradeCount}`);
if (playerRun.user_count !== (profiles ?? []).length) critical.push("Player audit count does not match profile count");
if (playerRun.reset_achievements_unlocked_after !== 0) critical.push("Reset achievements remain unlocked");
if (
  playerRun.preserved_achievements_unlocked_before !==
  playerRun.preserved_achievements_unlocked_after
) critical.push("Unrelated achievement count changed");

console.log("# Market Reset v1.0 Validation Report\n");
console.log(`Run: ${run.id}`);
console.log(`Applied: ${run.applied_at}`);
console.log(`Critical issues: ${critical.length}\n`);
console.log("## Top 20 assets\n");
console.log("|Rank before|Rank after|Asset|Price before|Price after|");
console.log("|---:|---:|---|---:|---:|");
for (const row of assets ?? []) {
  const asset = row.asset as { name?: string } | null;
  console.log(`|${row.old_rank}|${row.new_rank}|${asset?.name ?? row.asset_id}|${row.old_price}|${row.new_price}|`);
}
console.log("\n## Top 100 portfolios\n");
console.log("|Rank before|Rank after|Player|Value before|Value after|Discrepancy|");
console.log("|---:|---:|---|---:|---:|---:|");
for (const row of portfolios ?? []) {
  console.log(`|${row.rank_before}|${row.rank_after}|${row.username}|${row.total_value_before}|${row.total_value_after}|${row.discrepancy}|`);
}
console.log("\n## Discrepancies\n");
if (critical.length === 0) console.log("None. Validation passed with zero critical issues.");
else critical.forEach((issue) => console.log(`- ${issue}`));

console.log("\n## Player reset audit\n");
console.log("|Player|Previous cash|Previous portfolio|Holdings removed|Trades removed|Reset at|");
console.log("|---|---:|---:|---:|---:|---|");
for (const row of playerAudit ?? []) {
  const profile = (profiles ?? []).find((item) => item.user_id === row.user_id);
  console.log(`|${profile?.username ?? row.user_id}|${row.previous_balance}|${row.previous_portfolio_value}|${row.previous_holdings_count}|${row.previous_trade_count}|${row.reset_at}|`);
}

if (critical.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
