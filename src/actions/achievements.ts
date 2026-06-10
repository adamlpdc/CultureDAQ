"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkAndUnlockAchievements } from "@/lib/achievements/unlock";
import type { UnlockedAchievement } from "@/types/database";

export async function syncAchievements(): Promise<UnlockedAchievement[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const unlocked = await checkAndUnlockAchievements(supabase, user.id);
  if (unlocked.length > 0) {
    revalidatePath("/achievements");
    revalidatePath("/portfolio");
    revalidatePath("/leaderboard");
  }
  return unlocked;
}
