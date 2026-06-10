import type { SupabaseClient } from "@supabase/supabase-js";
import type { Achievement } from "@/types/database";
import { getAchievementRarity } from "@/lib/achievements/rarity";
import {
  ACHIEVEMENT_SEED,
  getStaticAchievementsCatalog,
  seedIdFromCode,
} from "@/lib/achievements/seed-data";
import { ensureAchievementsSeeded } from "@/lib/achievements/seed";

function enrichAchievement(raw: Partial<Achievement> & Pick<Achievement, "code">): Achievement {
  const staticMatch = getStaticAchievementsCatalog().find((a) => a.code === raw.code);

  return {
    id: raw.id ?? seedIdFromCode(raw.code),
    code: raw.code,
    name: staticMatch?.name ?? raw.name ?? raw.code,
    description: staticMatch?.description ?? raw.description ?? "",
    category: staticMatch?.category ?? raw.category ?? "Special",
    points: staticMatch?.points ?? raw.points ?? 0,
    icon: staticMatch?.icon ?? raw.icon ?? "🏆",
    requirement_type: staticMatch?.requirement_type ?? raw.requirement_type ?? "",
    requirement_value: staticMatch?.requirement_value ?? raw.requirement_value ?? {},
    is_hidden: staticMatch?.is_hidden ?? raw.is_hidden ?? false,
    rarity: staticMatch?.rarity ?? raw.rarity ?? getAchievementRarity(raw.code),
    scope: staticMatch?.scope ?? raw.scope ?? "standard",
    season_id: raw.season_id ?? staticMatch?.season_id ?? null,
    event_id: raw.event_id ?? staticMatch?.event_id ?? null,
    league_id: raw.league_id ?? staticMatch?.league_id ?? null,
    available_from: raw.available_from ?? staticMatch?.available_from ?? null,
    available_until: raw.available_until ?? staticMatch?.available_until ?? null,
    created_at: raw.created_at ?? staticMatch?.created_at ?? new Date().toISOString(),
  };
}

const SEED_ORDER = new Map(ACHIEVEMENT_SEED.map((row, index) => [row.code, index]));

function sortBySeedOrder(achievements: Achievement[]): Achievement[] {
  return [...achievements].sort(
    (a, b) => (SEED_ORDER.get(a.code) ?? 999) - (SEED_ORDER.get(b.code) ?? 999)
  );
}

export async function loadAchievementsCatalog(
  supabase: SupabaseClient
): Promise<Achievement[]> {
  await ensureAchievementsSeeded();

  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .order("category")
    .order("points", { ascending: true });

  if (!error && data && data.length > 0) {
    return sortBySeedOrder(
      (data as Partial<Achievement>[]).map((row) => enrichAchievement(row as Achievement))
    );
  }

  return getStaticAchievementsCatalog();
}

export function buildAchievementIdMap(
  dbAchievements: Achievement[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const a of dbAchievements) {
    map.set(a.code, a.id);
    map.set(seedIdFromCode(a.code), a.id);
  }
  return map;
}

/** Filter to currently visible achievements (future seasonal/event support) */
export function filterVisibleAchievements(
  achievements: Achievement[],
  now = new Date()
): Achievement[] {
  return achievements.filter((a) => {
    if (a.is_hidden) return false;
    if (a.available_from && new Date(a.available_from) > now) return false;
    if (a.available_until && new Date(a.available_until) < now) return false;
    return true;
  });
}
