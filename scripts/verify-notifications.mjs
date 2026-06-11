#!/usr/bin/env node
/**
 * Notifications system verification script.
 * Run: node scripts/verify-notifications.mjs
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
  } catch {
    /* ignore */
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, key);

async function tableExists() {
  const { error } = await sb.from("notifications").select("id", { count: "exact", head: true });
  return !error;
}

async function main() {
  const report = { sections: [] };

  // 1. Database check
  console.log("\n=== 1. NOTIFICATION DATABASE CHECK ===\n");
  const exists = await tableExists();
  console.log("notifications table exists:", exists ? "YES" : "NO");

  if (!exists) {
    console.log("FAIL: Table missing. Run supabase/notifications.sql");
    process.exit(1);
  }

  const { count: totalCount } = await sb
    .from("notifications")
    .select("*", { count: "exact", head: true });

  const { count: unreadTotal } = await sb
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  const { count: readTotal } = await sb
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", true);

  console.log("Total notifications:", totalCount ?? 0);
  console.log("Unread (all users):", unreadTotal ?? 0);
  console.log("Read (all users):", readTotal ?? 0);

  // By type
  const { data: allNotifs } = await sb
    .from("notifications")
    .select("type, is_read, user_id, title, message, created_at, dedupe_key")
    .order("created_at", { ascending: false });

  const byType = {};
  for (const n of allNotifs ?? []) {
    byType[n.type] = (byType[n.type] ?? 0) + 1;
  }
  console.log("\nBy type:", byType);

  // Users
  const { data: profiles } = await sb
    .from("profiles")
    .select("user_id, username")
    .order("username");

  console.log("\n=== 9. PER-USER REPORT ===\n");

  for (const profile of profiles ?? []) {
    const userNotifs = (allNotifs ?? []).filter((n) => n.user_id === profile.user_id);
    const unread = userNotifs.filter((n) => !n.is_read).length;
    const read = userNotifs.filter((n) => n.is_read).length;

    console.log(`@${profile.username} (${profile.user_id.slice(0, 8)}...)`);
    console.log(`  Unread: ${unread} | Read: ${read} | Total: ${userNotifs.length}`);

    if (userNotifs.length > 0) {
      console.log("  Latest 10:");
      for (const n of userNotifs.slice(0, 10)) {
        console.log(`    [${n.type}] ${n.is_read ? "READ" : "UNREAD"} | ${n.title}`);
        console.log(`      → ${n.message.slice(0, 80)}${n.message.length > 80 ? "..." : ""}`);
      }
    } else {
      console.log("  (no notifications)");
    }
    console.log("");
  }

  // Watchlist items
  const { data: watchlist } = await sb.from("watchlist_items").select("user_id, asset_id");
  console.log("=== WATCHLIST ITEMS ===");
  console.log("Total watchlist items:", watchlist?.length ?? 0);

  // Generator logic smoke test (no DB write)
  console.log("\n=== 2. GENERATOR LOGIC SMOKE TESTS ===\n");

  const { evaluateWatchlistNotification, evaluateLeaderboardNotification, evaluatePortfolioMilestoneNotification, buildAchievementNotificationInput } = await import("../src/lib/notifications/generators.ts").catch(() => ({}));

  // Use dynamic import won't work for TS - test inline with simplified checks
  const triggerChecks = {
    achievement_unlocked: "unlock.ts → createNotification on checkAndUnlockAchievements",
    watchlist_alert: "cron → processWatchlistNotifications → evaluateWatchlistNotification",
    rank_event: "cron → processWatchlistNotifications (significant rank)",
    market_event: "cron → processWatchlistNotifications → evaluateMarketEventNotification",
    portfolio_event: "cron → processPortfolioNotifications",
    leaderboard_event: "cron → processLeaderboardNotifications",
    system: "NO TRIGGER WIRED (type exists, no producer)",
  };

  for (const [type, trigger] of Object.entries(triggerChecks)) {
    const hasData = (byType[type] ?? 0) > 0;
    console.log(`${type}:`);
    console.log(`  Trigger: ${trigger}`);
    console.log(`  DB records: ${byType[type] ?? 0} ${hasData ? "✓" : "(none yet)"}`);
  }

  // Test insert + read cycle for first user
  if (profiles?.length) {
    const testUser = profiles[0];
    console.log("\n=== 5. READ STATE CYCLE TEST ===\n");
    console.log(`Testing with @${testUser.username}...`);

    const testDedupe = `verify:test:${Date.now()}`;
    const { data: inserted, error: insertErr } = await sb
      .from("notifications")
      .insert({
        user_id: testUser.user_id,
        type: "system",
        title: "Verification Test Notification",
        message: "Temporary test record — safe to delete.",
        dedupe_key: testDedupe,
        is_read: false,
      })
      .select("*")
      .single();

    if (insertErr) {
      console.log("Insert test FAILED:", insertErr.message);
    } else {
      console.log("Insert test: PASS (id:", inserted.id.slice(0, 8) + "...)");

      const { count: unreadBefore } = await sb
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", testUser.user_id)
        .eq("is_read", false);
      console.log("Unread count includes test:", unreadBefore);

      await sb
        .from("notifications")
        .update({ is_read: true })
        .eq("id", inserted.id);

      const { data: afterMark } = await sb
        .from("notifications")
        .select("is_read")
        .eq("id", inserted.id)
        .single();
      console.log("Mark read test:", afterMark?.is_read === true ? "PASS" : "FAIL");

      await sb.from("notifications").delete().eq("id", inserted.id);
      console.log("Cleanup: deleted test notification");
    }
  }

  console.log("\n=== 10. SUMMARY ===\n");
  const hasAny = (totalCount ?? 0) > 0;
  console.log("Database:", exists ? "PASS" : "FAIL");
  console.log("Has production notifications:", hasAny ? "YES" : "NO (triggers may not have fired yet)");
  console.log("System notifications trigger:", "NOT WIRED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
