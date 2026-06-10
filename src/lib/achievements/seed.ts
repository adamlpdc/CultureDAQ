import { createAdminClient, hasSupabaseAdminCredentials } from "@/lib/supabase/admin";
import { ACHIEVEMENT_SEED } from "@/lib/achievements/seed-data";
import { getAchievementRarity } from "@/lib/achievements/rarity";

export async function ensureAchievementsSeeded(): Promise<boolean> {
  if (!hasSupabaseAdminCredentials()) return false;

  try {
    const admin = createAdminClient();
    const { count, error: countError } = await admin
      .from("achievements")
      .select("*", { count: "exact", head: true });

    if (countError) return false;
    if (count != null && count >= ACHIEVEMENT_SEED.length) return true;

    const payload = ACHIEVEMENT_SEED.map((row) => ({
      code: row.code,
      name: row.name,
      description: row.description,
      category: row.category,
      points: row.points,
      icon: row.icon,
      requirement_type: row.requirement_type,
      requirement_value: row.requirement_value,
      is_hidden: row.is_hidden,
      rarity: getAchievementRarity(row.code),
      scope: "standard" as const,
    }));

    const { error } = await admin.from("achievements").upsert(payload, { onConflict: "code" });
    return !error;
  } catch {
    return false;
  }
}
