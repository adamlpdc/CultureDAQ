/**
 * Verification script for asset ranking system.
 * Usage: node scripts/verify-rankings.mjs [--backfill]
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
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
const wantBackfill = process.argv.includes("--backfill");

if (!url || !anonKey) {
  console.error("Missing Supabase URL or anon key in .env.local");
  process.exit(1);
}

const supabase = createClient(url, anonKey);
const admin =
  serviceKey && serviceKey.length > 10
    ? createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const issues = [];
const passes = [];

async function main() {
  console.log("=== CultureDAQ Asset Ranking Verification ===\n");

  // 1. Table exists
  const { data: historySample, error: historyError } = await supabase
    .from("asset_rank_history")
    .select("id")
    .limit(1);

  if (historyError) {
    issues.push(`asset_rank_history table: ${historyError.message}`);
    if (historyError.code === "42P01" || historyError.message.includes("does not exist")) {
      console.log("❌ Table missing — run supabase/asset-rank-history.sql");
    }
  } else {
    passes.push("asset_rank_history table exists and is readable");
  }

  // 2. Load assets
  const { data: assets, error: assetsError } = await supabase
    .from("assets")
    .select("id, slug, name, current_price")
    .order("current_price", { ascending: false });

  if (assetsError) {
    issues.push(`assets query: ${assetsError.message}`);
    printReport();
    process.exit(1);
  }

  const assetCount = assets?.length ?? 0;
  passes.push(`${assetCount} active assets loaded`);

  const liveRanks = calculateAssetRanks(assets ?? []);
  const liveMap = new Map(liveRanks.map((r) => [r.assetId, r]));

  // Top 3 by price
  console.log("Live ranks (by current_price DESC):");
  for (const r of liveRanks.slice(0, 3)) {
    const a = assets.find((x) => x.id === r.assetId);
    console.log(`  #${r.rank} ${a?.name} — ${r.price} DAQ`);
  }
  console.log();

  if (!historyError) {
    const { data: allHistory, error: allHistErr } = await supabase
      .from("asset_rank_history")
      .select("*")
      .order("recorded_at", { ascending: false });

    if (allHistErr) {
      issues.push(`history fetch: ${allHistErr.message}`);
    } else {
      const totalRows = allHistory?.length ?? 0;
      const latestByAsset = new Map();
      for (const row of allHistory ?? []) {
        if (!latestByAsset.has(row.asset_id)) latestByAsset.set(row.asset_id, row);
      }

      passes.push(`${totalRows} total snapshot rows, ${latestByAsset.size} assets with latest snapshot`);

      if (latestByAsset.size === 0) {
        issues.push("No rank snapshots in DB — backfill needed");
      } else if (latestByAsset.size < assetCount) {
        issues.push(
          `Only ${latestByAsset.size}/${assetCount} assets have snapshots — partial backfill may be needed`
        );
      }

      // 3. Compare stored rank vs live rank
      let rankMismatches = 0;
      for (const [assetId, row] of latestByAsset) {
        const live = liveMap.get(assetId);
        if (live && live.rank !== row.rank) {
          rankMismatches++;
          if (rankMismatches <= 3) {
            const a = assets.find((x) => x.id === assetId);
            issues.push(
              `Rank drift: ${a?.slug} stored #${row.rank} vs live #${live.rank} (cron may not have run since last price change)`
            );
          }
        }
      }
      if (rankMismatches === 0 && latestByAsset.size > 0) {
        passes.push("All latest snapshots match live price-based ranks");
      } else if (rankMismatches > 3) {
        issues.push(`...and ${rankMismatches - 3} more rank mismatches`);
      }

      // 4. Validate rank_change formula
      let changeErrors = 0;
      for (const row of allHistory ?? []) {
        if (row.previous_rank == null) continue;
        const expected = row.previous_rank - row.rank;
        if (row.rank_change !== expected) {
          changeErrors++;
          if (changeErrors <= 2) {
            issues.push(
              `rank_change mismatch asset ${row.asset_id}: stored ${row.rank_change}, expected ${expected}`
            );
          }
        }
      }
      if (changeErrors === 0) {
        passes.push("previous_rank / rank_change formula correct on all rows");
      } else {
        issues.push(`${changeErrors} rows with incorrect rank_change`);
      }

      // Snapshot timestamps
      const timestamps = new Set((allHistory ?? []).map((r) => r.recorded_at));
      passes.push(`${timestamps.size} distinct snapshot batch(es)`);
    }
  }

  // 5. Fallback path (no history)
  if (historyError || (await supabase.from("asset_rank_history").select("id").limit(1)).data?.length === 0) {
    const sample = liveRanks[0];
    if (sample) {
      passes.push(
        `Fallback: live rank for top asset would be #${sample.rank} without DB history`
      );
    }
  }

  // 6. Page health
  try {
    const res = await fetch("http://localhost:3002/");
    if (res.ok) passes.push(`Homepage responds ${res.status}`);
    else issues.push(`Homepage returned ${res.status}`);
  } catch {
    issues.push("Homepage not reachable at localhost:3002 (dev server may be down)");
  }

  if (assets?.[0]?.slug) {
    try {
      const res = await fetch(`http://localhost:3002/asset/${assets[0].slug}`);
      if (res.ok) passes.push(`Asset detail page responds ${res.status} for ${assets[0].slug}`);
      else issues.push(`Asset page returned ${res.status}`);
    } catch {
      issues.push("Asset detail page not reachable");
    }
  }

  // Backfill
  if (wantBackfill) {
    if (!admin) {
      issues.push("Backfill skipped: SUPABASE_SERVICE_ROLE_KEY not set in .env.local");
    } else {
      console.log("Running backfill via service role...");
      const { data: allAssets } = await admin.from("assets").select("id, current_price");
      const ranks = calculateAssetRanks(allAssets ?? []);
      const { data: existing } = await admin
        .from("asset_rank_history")
        .select("*")
        .order("recorded_at", { ascending: false });
      const latest = new Map();
      for (const row of existing ?? []) {
        if (!latest.has(row.asset_id)) latest.set(row.asset_id, row);
      }
      const now = new Date().toISOString();
      const rows = [];
      for (const entry of ranks) {
        const prev = latest.get(entry.assetId);
        const previousRank = prev?.rank ?? null;
        const rankChange = previousRank != null ? previousRank - entry.rank : null;
        if (prev && prev.rank === entry.rank && Number(prev.price) === entry.price) continue;
        rows.push({
          asset_id: entry.assetId,
          rank: entry.rank,
          previous_rank: previousRank,
          rank_change: rankChange,
          portfolio_value_basis: entry.price,
          price: entry.price,
          recorded_at: now,
        });
      }
      if (rows.length === 0) {
        passes.push("Backfill: no new snapshots needed (ranks unchanged)");
      } else {
        const { error: insErr } = await admin.from("asset_rank_history").insert(rows);
        if (insErr) issues.push(`Backfill insert failed: ${insErr.message}`);
        else passes.push(`Backfill: inserted ${rows.length} snapshots`);
      }
    }
  }

  printReport();
  process.exit(issues.length > 0 ? 1 : 0);
}

function printReport() {
  console.log("--- PASS ---");
  for (const p of passes) console.log(`✓ ${p}`);
  console.log("\n--- ISSUES ---");
  if (issues.length === 0) console.log("(none)");
  for (const i of issues) console.log(`✗ ${i}`);
  console.log();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
