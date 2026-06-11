#!/usr/bin/env node
/**
 * Full notifications E2E verification (no TS imports).
 * Run: node scripts/verify-notifications-e2e.mjs
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim();
    }
  } catch { /* ignore */ }
  return env;
}

// --- Inlined from rank-significance + generators (for verification only) ---

function detectSignificantRankEvent(previousRank, currentRank) {
  if (previousRank === currentRank) return null;
  if (currentRank < previousRank) {
    if (currentRank === 1 && previousRank > 1) return { headline: "Reached #1", bullet: `Surged to #1`, milestone: "reached_number_one", isPositive: true };
    if (previousRank > 10 && currentRank <= 10) return { headline: "Entered Top 10", bullet: `Entered Top 10 from #${previousRank}`, milestone: "entered_top_10", isPositive: true };
    if (previousRank > 25 && currentRank <= 25) return { headline: "Entered Top 25", bullet: `Top 25 from #${previousRank}`, milestone: "entered_top_25", isPositive: true };
    if (previousRank > 50 && currentRank <= 50) return { headline: "Entered Top 50", bullet: `Top 50 from #${previousRank}`, milestone: "entered_top_50", isPositive: true };
    return null;
  }
  return null;
}

function getPriceChange(current, previous) {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function evaluateWatchlistNotification(item, movement) {
  const priceChange = getPriceChange(item.asset.current_price, item.asset.previous_price);
  if (movement?.previousRank != null && movement.rankChange != null) {
    const significant = detectSignificantRankEvent(movement.previousRank, movement.rank);
    if (significant) {
      return { title: `${item.asset.name} ${significant.headline.toLowerCase()}`, notificationType: significant.isPositive ? "rank_event" : "watchlist_alert" };
    }
    const places = Math.abs(movement.rankChange);
    if (places >= 10) {
      const direction = movement.rankChange > 0 ? "up" : "down";
      return { title: `${item.asset.name} moved ${direction} ${places} places`, notificationType: "watchlist_alert" };
    }
  }
  if (priceChange >= 10) return { title: `${item.asset.name} is up ${priceChange.toFixed(1)}% today`, notificationType: "watchlist_alert" };
  if (priceChange <= -10) return { title: `${item.asset.name} is down ${Math.abs(priceChange).toFixed(1)}% today`, notificationType: "watchlist_alert" };
  return null;
}

function evaluateLeaderboardNotification(userId, previousRank, currentRank) {
  if (previousRank == null || previousRank === currentRank) return null;
  if (currentRank === 1 && previousRank > 1) return { title: "You reached #1" };
  if (previousRank > 10 && currentRank <= 10) return { title: "You entered the Top 10" };
  if (previousRank > 25 && currentRank <= 25) return { title: "You entered the Top 25" };
  const rankChange = previousRank - currentRank;
  if (Math.abs(rankChange) > 10) return { title: `You moved ${rankChange > 0 ? "up" : "down"} ${Math.abs(rankChange)} places` };
  return null;
}

function evaluatePortfolioMilestoneNotification(previousTotal, currentTotal) {
  for (const milestone of [150_000, 250_000, 500_000]) {
    if (previousTotal < milestone && currentTotal >= milestone) {
      return { title: `Portfolio value reached ${Math.round(milestone / 1000)}k DAQ` };
    }
  }
  return null;
}

const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const PREFIX = `verify:e2e:${Date.now()}`;

function pass(label, ok, detail = "") {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

function mockAsset(name, price, prev) {
  return { id: "test-asset-id", name, current_price: price, previous_price: prev };
}

async function createNotification(input) {
  const { data: existing } = input.dedupeKey
    ? await sb.from("notifications").select("id").eq("user_id", input.userId).eq("dedupe_key", input.dedupeKey).maybeSingle()
    : { data: null };
  if (existing) return null;

  const { data, error } = await sb.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    asset_id: input.assetId ?? null,
    achievement_id: input.achievementId ?? null,
    dedupe_key: input.dedupeKey ?? null,
  }).select("*").single();

  if (error) {
    if (error.code === "23505") return null;
    throw new Error(error.message);
  }
  return data;
}

async function main() {
  const results = {};

  const { data: profiles } = await sb.from("profiles").select("user_id, username").limit(1);
  const user = profiles?.[0];
  if (!user) { console.error("No users"); process.exit(1); }
  const userId = user.user_id;
  console.log(`\nTest user: @${user.username}\n`);

  // Generator tests
  console.log("=== 2 & 4. GENERATOR / WATCHLIST LOGIC ===\n");
  let ok = true;
  const asset = mockAsset("Taylor Swift", 100, 90);
  const item = (a) => ({ user_id: userId, asset_id: a.id, asset: a });

  for (const t of [
    { prev: 55, curr: 48, label: "Entered Top 50" },
    { prev: 30, curr: 22, label: "Entered Top 25" },
    { prev: 15, curr: 8, label: "Entered Top 10" },
    { prev: 3, curr: 1, label: "Reached #1" },
    { prev: 40, curr: 28, label: "Moved up 12" },
    { prev: 20, curr: 33, label: "Moved down 13" },
  ]) {
    const r = evaluateWatchlistNotification(item(asset), { previousRank: t.prev, rank: t.curr, rankChange: t.prev - t.curr });
    ok = pass(t.label, !!r, r?.title) && ok;
  }
  ok = pass("Gain 10%+", !!evaluateWatchlistNotification(item(mockAsset("Liverpool FC", 110, 100)), null)?.title.includes("up 10")) && ok;
  ok = pass("Loss 10%+", !!evaluateWatchlistNotification(item(mockAsset("Test", 85, 100)), null)?.title.includes("down 15")) && ok;
  ok = pass("Leaderboard Top 10", !!evaluateLeaderboardNotification(userId, 15, 8)?.title.includes("Top 10")) && ok;
  ok = pass("Leaderboard #1", !!evaluateLeaderboardNotification(userId, 2, 1)?.title.includes("#1")) && ok;
  ok = pass("Portfolio 150k", !!evaluatePortfolioMilestoneNotification(140_000, 160_000)?.title.includes("150k")) && ok;
  results.triggers = ok;

  // Seed notifications
  console.log("\n=== 3. SEED ALL TYPES ===\n");
  const { data: realAssets } = await sb.from("assets").select("id").limit(1);
  const assetId = realAssets?.[0]?.id;

  const seeds = [
    { type: "achievement_unlocked", title: "Trend Spotter", message: "Spot a rising asset early — +50 pts", dedupeKey: `${PREFIX}:achievement` },
    { type: "watchlist_alert", title: "Liverpool FC moved up 12 places", message: "Now ranked #18 in the market.", dedupeKey: `${PREFIX}:watchlist`, assetId },
    { type: "rank_event", title: "Taylor Swift entered the top 10", message: "Entered the Top 10 after moving up from #15", dedupeKey: `${PREFIX}:rank`, assetId },
    { type: "market_event", title: "Taylor Swift surges on tour announcement", message: "Major market event.", dedupeKey: `${PREFIX}:market`, assetId },
    { type: "portfolio_event", title: "Portfolio value reached 150k DAQ", message: "Total portfolio crossed 150k DAQ.", dedupeKey: `${PREFIX}:portfolio` },
    { type: "leaderboard_event", title: "You entered the Top 10", message: "You climbed to #8.", dedupeKey: `${PREFIX}:leaderboard` },
    { type: "system", title: "Welcome to CultureDAQ Notifications", message: "System test.", dedupeKey: `${PREFIX}:system` },
  ];

  let seeded = 0;
  for (const s of seeds) {
    const r = await createNotification({ userId, ...s });
    if (r) { seeded++; pass(`Created ${s.type}`, true, r.title); }
    else pass(`Created ${s.type}`, false);
  }
  results.generation = seeded === seeds.length;

  // DB report
  console.log("\n=== 1 & 9. USER REPORT ===\n");
  const { count: unread } = await sb.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false);
  const { count: read } = await sb.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", true);
  console.log(`Unread: ${unread} | Read: ${read}`);

  const { data: latest } = await sb.from("notifications").select("type, title, message, is_read, dedupe_key").eq("user_id", userId).order("created_at", { ascending: false }).limit(10);
  console.log("\nLatest 10:");
  for (const n of latest ?? []) {
    const reason = n.dedupe_key?.startsWith("verify:") ? "E2E test seed" : "Production trigger";
    console.log(`  [${n.type}] ${n.is_read ? "READ" : "UNREAD"} | ${n.title} (${reason})`);
  }

  // Read state
  console.log("\n=== 5. READ STATE ===\n");
  const { data: one } = await sb.from("notifications").select("id").eq("user_id", userId).eq("is_read", false).limit(1).maybeSingle();
  let readOk = true;
  if (one) {
    await sb.from("notifications").update({ is_read: true }).eq("id", one.id);
    const { data: m } = await sb.from("notifications").select("is_read").eq("id", one.id).single();
    readOk = pass("Mark single read", m?.is_read === true) && readOk;
    await sb.from("notifications").update({ is_read: false }).eq("id", one.id);
  }
  const { count: ub } = await sb.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false);
  await sb.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  const { count: ua } = await sb.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false);
  readOk = pass("Mark all read", ua === 0, `${ub} → 0`) && readOk;
  await sb.from("notifications").update({ is_read: false }).eq("user_id", userId).like("dedupe_key", `${PREFIX}%`);
  results.readState = readOk;

  // Quality
  console.log("\n=== 8. QUALITY ===\n");
  let qualityOk = true;
  for (const n of latest ?? []) {
    qualityOk = pass(`"${n.title}"`, !/price changed|^asset moved$/i.test(n.title)) && qualityOk;
  }
  results.quality = qualityOk;

  // Watchlist live
  const { data: wl } = await sb.from("watchlist_items").select("asset:assets(name, current_price, previous_price)").eq("user_id", userId);
  console.log("\n=== 4. LIVE WATCHLIST ===\n");
  for (const w of wl ?? []) {
    const a = w.asset;
    const pct = a ? (((a.current_price - a.previous_price) / a.previous_price) * 100).toFixed(1) : "?";
    console.log(`  ${a?.name}: ${pct}% (needs ±10% for price alert)`);
  }

  // Cron
  console.log("\n=== CRON ===\n");
  if (env.CRON_SECRET) {
    try {
      const res = await fetch("http://127.0.0.1:3002/api/cron/update-prices", {
        headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
        signal: AbortSignal.timeout(90000),
      });
      if (res.ok) {
        const body = await res.json();
        pass("Cron", true, `${body.notificationsCreated ?? 0} notifications`);
        console.log(JSON.stringify({ notificationsCreated: body.notificationsCreated, updated: body.updated, errors: body.errors }, null, 2));
      } else pass("Cron", false, `HTTP ${res.status}`);
    } catch (e) {
      pass("Cron", false, e.message);
    }
  }

  console.log(`\nPrefix: ${PREFIX}`);
  console.log("\n=== SUMMARY ===");
  for (const [k, v] of Object.entries(results)) console.log(`${k}: ${v ? "PASS" : "FAIL"}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
