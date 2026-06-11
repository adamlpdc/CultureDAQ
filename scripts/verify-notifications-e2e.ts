/**
 * Full notifications E2E verification — generator logic + DB seed + read state.
 * Run: npx tsx scripts/verify-notifications-e2e.ts
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import {
  evaluateWatchlistNotification,
  evaluateMarketEventNotification,
  evaluateLeaderboardNotification,
  evaluatePortfolioMilestoneNotification,
  evaluateHoldingGainNotifications,
  buildAchievementNotificationInput,
} from "../src/lib/notifications/generators";
import { createNotification } from "../src/lib/notifications";
import { checkAndUnlockAchievements } from "../src/lib/achievements/unlock";
import type { Asset, MarketEvent } from "../src/types/database";
import type { WatchlistItemWithAsset } from "../src/lib/watchlist";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim();
    }
  } catch {
    /* ignore */
  }
  return env;
}

const env = loadEnv();
const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL!,
  env.SUPABASE_SERVICE_ROLE_KEY!
);

const PREFIX = `verify:e2e:${Date.now()}`;

function pass(label: string, ok: boolean, detail = ""): boolean {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

function mockAsset(name: string, price: number, prevPrice: number): Asset {
  return {
    id: `00000000-0000-4000-8000-${name.slice(0, 12).padEnd(12, "0")}`,
    name,
    slug: name.toLowerCase().replace(/\s/g, "-"),
    current_price: price,
    previous_price: prevPrice,
    category: "music",
  } as Asset;
}

function mockWatchlistItem(userId: string, asset: Asset): WatchlistItemWithAsset {
  return {
    user_id: userId,
    asset_id: asset.id,
    asset,
    created_at: new Date().toISOString(),
  } as WatchlistItemWithAsset;
}

async function main() {
  const results: Record<string, boolean> = {};

  const { data: profiles } = await sb.from("profiles").select("user_id, username").limit(1);
  const user = profiles?.[0];
  if (!user) {
    console.error("No users found");
    process.exit(1);
  }
  const userId = user.user_id;
  console.log(`\nTest user: @${user.username}\n`);

  console.log("=== 2 & 4. GENERATOR / WATCHLIST LOGIC TESTS ===\n");

  const asset = mockAsset("Taylor Swift", 100, 90);
  let watchlistLogicOk = true;

  const rankTests = [
    { prev: 55, curr: 48, label: "Entered Top 50" },
    { prev: 30, curr: 22, label: "Entered Top 25" },
    { prev: 15, curr: 8, label: "Entered Top 10" },
    { prev: 3, curr: 1, label: "Reached #1" },
    { prev: 40, curr: 28, label: "Moved up 12 places" },
    { prev: 20, curr: 33, label: "Moved down 13 places" },
  ];

  for (const t of rankTests) {
    const item = mockWatchlistItem(userId, asset);
    const result = evaluateWatchlistNotification(item, {
      assetId: asset.id,
      rank: t.curr,
      previousRank: t.prev,
      rankChange: t.prev - t.curr,
      recordedAt: new Date().toISOString(),
      isNewlyRanked: false,
    });
    const ok = result != null && result.title.length > 10;
    watchlistLogicOk = pass(t.label, ok, result?.title ?? "null") && watchlistLogicOk;
  }

  watchlistLogicOk =
    pass(
      "Gain 10%+",
      !!evaluateWatchlistNotification(mockWatchlistItem(userId, mockAsset("Liverpool FC", 110, 100)), null)?.title.includes("up 10")
    ) && watchlistLogicOk;

  watchlistLogicOk =
    pass(
      "Loss 10%+",
      !!evaluateWatchlistNotification(mockWatchlistItem(userId, mockAsset("Test Asset", 85, 100)), null)?.title.includes("down 15")
    ) && watchlistLogicOk;

  const marketEvent: MarketEvent = {
    id: "evt-test",
    asset_id: asset.id,
    headline: "Taylor Swift surges on tour announcement",
    description: "Major market event affecting watched asset.",
    impact_score: 4,
    event_type: "news",
    created_at: new Date().toISOString(),
  } as MarketEvent;

  watchlistLogicOk =
    pass(
      "Major market event",
      evaluateMarketEventNotification(userId, asset, marketEvent)?.notificationType === "market_event",
      evaluateMarketEventNotification(userId, asset, marketEvent)?.title
    ) && watchlistLogicOk;

  results.triggers = watchlistLogicOk;

  let lbOk = true;
  lbOk = pass("Leaderboard entered Top 10", !!evaluateLeaderboardNotification(userId, 15, 8)?.title.includes("Top 10")) && lbOk;
  lbOk = pass("Leaderboard reached #1", !!evaluateLeaderboardNotification(userId, 2, 1)?.title.includes("#1")) && lbOk;
  lbOk = pass("Leaderboard moved up 12", !!evaluateLeaderboardNotification(userId, 30, 18)?.title.includes("up 12")) && lbOk;
  results.leaderboardTriggers = lbOk;

  const milestone = evaluatePortfolioMilestoneNotification(userId, 140_000, 160_000);
  pass("Portfolio milestone 150k", !!milestone?.title.includes("150"), milestone?.title);

  const holdingGains = evaluateHoldingGainNotifications(userId, {
    user_id: userId,
    asset_id: asset.id,
    shares: 10,
    avg_cost: 80,
    asset: mockAsset("Holding Test", 100, 95),
  } as Parameters<typeof evaluateHoldingGainNotifications>[1]);
  pass("Holding gain notification", holdingGains.length > 0, holdingGains[0]?.title);

  const achInput = buildAchievementNotificationInput(
    userId,
    { code: "trend_spotter", name: "Trend Spotter", icon: "🔥", points: 50, rarity: "common", unlockedAt: new Date().toISOString() },
    "ach-id-test",
    "Spot a rising asset early"
  );
  pass("Achievement notification title", achInput.title === "Trend Spotter", achInput.message);

  console.log("\n=== 3. SEED NOTIFICATIONS (each type) ===\n");

  const { data: realAssets } = await sb.from("assets").select("id, name").limit(1);
  const realAssetId = realAssets?.[0]?.id ?? null;

  const seedInputs = [
    { userId, type: "achievement_unlocked" as const, title: "Trend Spotter", message: "Spot a rising asset early — +50 pts", dedupeKey: `${PREFIX}:achievement` },
    { userId, type: "watchlist_alert" as const, title: "Liverpool FC moved up 12 places", message: "Now ranked #18 in the market.", assetId: realAssetId ?? undefined, dedupeKey: `${PREFIX}:watchlist_move` },
    { userId, type: "rank_event" as const, title: "Taylor Swift entered the top 10", message: "Entered the Top 10 after moving up from #15", assetId: realAssetId ?? undefined, dedupeKey: `${PREFIX}:rank_event` },
    { userId, type: "market_event" as const, title: "Taylor Swift surges on tour announcement", message: "Major market event affecting watched asset.", assetId: realAssetId ?? undefined, dedupeKey: `${PREFIX}:market_event` },
    { userId, type: "portfolio_event" as const, title: "Portfolio value reached 150k DAQ", message: "Your total portfolio value (cash + holdings) crossed 150k DAQ.", dedupeKey: `${PREFIX}:portfolio` },
    { userId, type: "leaderboard_event" as const, title: "You entered the Top 10", message: "You climbed to #8 on the leaderboard.", dedupeKey: `${PREFIX}:leaderboard` },
    { userId, type: "system" as const, title: "Welcome to CultureDAQ Notifications", message: "System notification test (no production trigger wired yet).", dedupeKey: `${PREFIX}:system` },
  ];

  let seeded = 0;
  for (const input of seedInputs) {
    const result = await createNotification(sb, input);
    if (result) {
      seeded++;
      pass(`Created ${input.type}`, true, result.title);
    } else {
      pass(`Created ${input.type}`, false, "returned null");
    }
  }
  results.generation = seeded === seedInputs.length;

  console.log("\n=== 1 & 9. DATABASE / USER REPORT ===\n");

  const { count: unread } = await sb.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false);
  const { count: read } = await sb.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", true);

  console.log(`Unread: ${unread}`);
  console.log(`Read: ${read}`);

  const { data: latest } = await sb
    .from("notifications")
    .select("type, title, message, is_read, created_at, dedupe_key")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  console.log("\nLatest 10 notifications:");
  for (const n of latest ?? []) {
    const reason = n.dedupe_key?.startsWith("verify:")
      ? "E2E test seed"
      : n.type === "achievement_unlocked"
        ? "Achievement unlock trigger"
        : ["watchlist_alert", "rank_event", "market_event"].includes(n.type)
          ? "Cron watchlist fan-out"
          : n.type === "portfolio_event"
            ? "Cron portfolio fan-out"
            : n.type === "leaderboard_event"
              ? "Cron leaderboard fan-out"
              : "Unknown";
    console.log(`  [${n.type}] ${n.is_read ? "READ" : "UNREAD"} | ${n.title}`);
    console.log(`    Reason: ${reason}`);
  }

  console.log("\n=== 5. READ STATE TESTS ===\n");

  const { data: firstUnread } = await sb.from("notifications").select("id").eq("user_id", userId).eq("is_read", false).limit(1).maybeSingle();

  let readStateOk = true;
  if (firstUnread) {
    await sb.from("notifications").update({ is_read: true }).eq("id", firstUnread.id);
    const { data: marked } = await sb.from("notifications").select("is_read").eq("id", firstUnread.id).single();
    readStateOk = pass("Mark single read", marked?.is_read === true) && readStateOk;
    await sb.from("notifications").update({ is_read: false }).eq("id", firstUnread.id);
  }

  const { count: unreadBeforeAll } = await sb.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false);
  await sb.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  const { count: unreadAfterAll } = await sb.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false);
  readStateOk = pass("Mark all read", unreadAfterAll === 0, `${unreadBeforeAll} → 0`) && readStateOk;
  await sb.from("notifications").update({ is_read: false }).eq("user_id", userId).like("dedupe_key", `${PREFIX}%`);
  results.readState = readStateOk;

  console.log("\n=== 8. NOTIFICATION QUALITY REVIEW ===\n");
  const badPatterns = [/price changed/i, /^asset moved$/i];
  let qualityOk = true;
  for (const n of latest ?? []) {
    qualityOk = pass(`Quality: "${n.title}"`, !badPatterns.some((p) => p.test(n.title))) && qualityOk;
  }
  results.quality = qualityOk;

  const { data: watchItems } = await sb
    .from("watchlist_items")
    .select("asset_id, asset:assets(name, current_price, previous_price)")
    .eq("user_id", userId);

  console.log("\n=== 4. LIVE WATCHLIST STATE ===\n");
  console.log(`Watched assets: ${watchItems?.length ?? 0}`);
  for (const w of watchItems ?? []) {
    const a = w.asset as { name: string; current_price: number; previous_price: number } | null;
    const pct = a ? (((a.current_price - a.previous_price) / a.previous_price) * 100).toFixed(1) : "?";
    console.log(`  ${a?.name}: ${pct}% change`);
  }

  console.log("\n=== 3. ACHIEVEMENT UNLOCK ATTEMPT ===\n");
  try {
    const unlocked = await checkAndUnlockAchievements(sb, userId);
    if (unlocked.length > 0) {
      console.log(`Unlocked: ${unlocked.map((a) => a.name).join(", ")}`);
    } else {
      console.log("No new achievements (user may already qualify for none new).");
    }
    pass("Achievement trigger runs", true);
  } catch (e) {
    pass("Achievement unlock", false, e instanceof Error ? e.message : "error");
  }

  console.log("\n=== CRON NOTIFICATION FAN-OUT ===\n");
  if (env.CRON_SECRET) {
    try {
      const res = await fetch("http://127.0.0.1:3002/api/cron/update-prices", {
        headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
        signal: AbortSignal.timeout(60000),
      });
      if (res.ok) {
        const body = await res.json();
        console.log(JSON.stringify(body, null, 2));
        pass("Cron ran", true, `${body.notificationsCreated ?? 0} created`);
      } else {
        pass("Cron ran", false, `HTTP ${res.status}`);
      }
    } catch (e) {
      pass("Cron ran", false, e instanceof Error ? e.message : "error");
    }
  }

  console.log(`\nTest data prefix: ${PREFIX} (dedupe_key LIKE '${PREFIX}%')`);
  console.log("\n=== SUMMARY ===");
  for (const [k, v] of Object.entries(results)) {
    console.log(`${k}: ${v ? "PASS" : "FAIL"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
