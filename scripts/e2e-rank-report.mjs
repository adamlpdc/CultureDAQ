/**
 * End-to-end asset ranking verification report.
 * Usage: node scripts/e2e-rank-report.mjs
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

function calculateAssetRanks(assets) {
  const sorted = [...assets].sort((a, b) => {
    const diff = Number(b.current_price) - Number(a.current_price);
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
  return sorted.map((a, i) => ({
    assetId: a.id,
    rank: i + 1,
    price: Number(a.current_price),
  }));
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = env.CRON_SECRET;

const supabase = createClient(url, anonKey);
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const report = { checks: [], issues: [], stats: {} };

function pass(msg) {
  report.checks.push({ ok: true, msg });
}
function fail(msg) {
  report.issues.push(msg);
  report.checks.push({ ok: false, msg });
}

async function main() {
  const { data: assets } = await supabase.from("assets").select("id, slug, name, current_price");
  const assetCount = assets?.length ?? 0;
  report.stats.activeAssets = assetCount;

  const { data: allHistory } = await supabase
    .from("asset_rank_history")
    .select("*, asset:assets(name, slug)")
    .order("recorded_at", { ascending: false });

  const totalSnapshots = allHistory?.length ?? 0;
  report.stats.totalSnapshots = totalSnapshots;

  const batches = new Set((allHistory ?? []).map((r) => r.recorded_at));
  report.stats.snapshotBatches = batches.size;

  if (totalSnapshots > 0) pass(`asset_rank_history contains ${totalSnapshots} records`);
  else fail("asset_rank_history is empty");

  const latestByAsset = new Map();
  for (const row of allHistory ?? []) {
    if (!latestByAsset.has(row.asset_id)) latestByAsset.set(row.asset_id, row);
  }

  if (latestByAsset.size === assetCount) {
    pass(`All ${assetCount} active assets have latest rank snapshots`);
  } else {
    fail(`Only ${latestByAsset.size}/${assetCount} assets have latest snapshots`);
  }

  const liveRanks = calculateAssetRanks(assets ?? []);
  const liveMap = new Map(liveRanks.map((r) => [r.assetId, r]));

  let rankDrift = 0;
  for (const [assetId, row] of latestByAsset) {
    const live = liveMap.get(assetId);
    if (live && live.rank !== row.rank) rankDrift++;
    if (row.previous_rank != null && row.rank_change !== row.previous_rank - row.rank) {
      fail(`Invalid rank_change for ${row.asset?.name ?? assetId}`);
    }
  }
  report.stats.rankDriftFromLive = rankDrift;

  if (rankDrift === 0) pass("Latest snapshots match live price-based ranks");
  else fail(`${rankDrift} assets have stale snapshot ranks vs live prices (new cron/backfill needed)`);

  // Top 10 current (live)
  report.stats.top10 = liveRanks.slice(0, 10).map((r) => {
    const a = assets.find((x) => x.id === r.assetId);
    return { rank: r.rank, name: a?.name, slug: a?.slug, price: r.price };
  });

  // Movement from latest snapshots
  const withMovement = [...latestByAsset.values()].filter(
    (r) => r.rank_change != null && r.rank_change !== 0
  );
  const gainers = [...withMovement]
    .filter((r) => r.rank_change > 0)
    .sort((a, b) => b.rank_change - a.rank_change)
    .slice(0, 5)
    .map((r) => ({
      name: r.asset?.name,
      rank: r.rank,
      previousRank: r.previous_rank,
      change: r.rank_change,
    }));
  const losers = [...withMovement]
    .filter((r) => r.rank_change < 0)
    .sort((a, b) => a.rank_change - b.rank_change)
    .slice(0, 5)
    .map((r) => ({
      name: r.asset?.name,
      rank: r.rank,
      previousRank: r.previous_rank,
      change: r.rank_change,
    }));

  report.stats.largestGainers = gainers;
  report.stats.largestLosers = losers;

  if (batches.size >= 2) {
    pass(`Rank movement data available (${withMovement.length} assets moved)`);
  } else {
    fail("Only 1 snapshot batch — rank movement untested until second cron/backfill run");
  }

  // Historical query test
  const sampleAsset = assets?.[0];
  if (sampleAsset) {
    const { data: hist } = await supabase
      .from("asset_rank_history")
      .select("rank, recorded_at")
      .eq("asset_id", sampleAsset.id)
      .order("recorded_at", { ascending: true });
    if ((hist?.length ?? 0) >= 1) {
      pass(`Historical rank query works (${hist.length} rows for ${sampleAsset.name})`);
      report.stats.historicalSample = hist;
    } else fail("Historical rank query returned no rows");
  }

  // Asset page live rank check
  const topSlug = report.stats.top10[0]?.slug;
  if (topSlug) {
    try {
      const res = await fetch(`http://localhost:3002/asset/${topSlug}`);
      const html = await res.text();
      const hasRank = html.includes("Current Rank") && html.includes("#1");
      if (res.ok && hasRank) pass(`Asset detail page shows live rank for ${topSlug}`);
      else fail(`Asset page missing rank UI for ${topSlug} (status ${res.status})`);
    } catch (e) {
      fail(`Asset page unreachable: ${e.message}`);
    }
  }

  // Discovery achievement helpers exist (code check)
  const { didUserOwnAssetBeforeRank, getAssetRankAtTime, getAssetBestHistoricalRank } =
    await import("../src/lib/asset-ranking.ts");
  if (
    typeof didUserOwnAssetBeforeRank === "function" &&
    typeof getAssetRankAtTime === "function" &&
    typeof getAssetBestHistoricalRank === "function"
  ) {
    pass("Historical rank helper functions exist for discovery achievements");
    if (sampleAsset) {
      const best = await getAssetBestHistoricalRank(admin, sampleAsset.id);
      const atTime = await getAssetRankAtTime(admin, sampleAsset.id, new Date().toISOString());
      report.stats.helperSample = { best, atTime };
    }
  } else fail("Missing historical rank helper functions");

  // Note: discovery achievements still use checkDiscoveryRank (trade-time rank), not historical yet
  report.stats.discoveryAchievementNote =
    "Helpers ready; unlock.ts still uses trades.asset_market_rank — migration pending";

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.issues.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
