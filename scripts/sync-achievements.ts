#!/usr/bin/env node
/** Sync achievements for all users after migration. Run: npx tsx scripts/sync-achievements.ts */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { checkAndUnlockAchievements } from "../src/lib/achievements/unlock";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: profiles } = await sb.from("profiles").select("user_id, username");
  for (const p of profiles ?? []) {
    const unlocked = await checkAndUnlockAchievements(sb, p.user_id);
    console.log(`@${p.username}: ${unlocked.length} newly unlocked`);
    for (const a of unlocked) {
      console.log(`  🏆 ${a.name} (+${a.points} pts)`);
    }
  }

  const { count: notifCount } = await sb
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("type", "achievement_unlocked");

  console.log(`\nTotal achievement_unlocked notifications: ${notifCount ?? 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
