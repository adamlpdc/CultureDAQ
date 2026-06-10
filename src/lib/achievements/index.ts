export type {
  AchievementDefinition,
  AchievementHighlight,
  AchievementId,
  EarnedAchievement,
  TraderAchievementInput,
  UserAchievementSummary,
} from "@/lib/achievements/types";

export {
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_BY_ID,
  DISPLAY_BADGE_PRIORITY,
} from "@/lib/achievements/definitions";

export {
  buildAchievementHighlights,
  buildCompetitiveNudge,
  computeEarnedAchievements,
  computeUserAchievementSummary,
  getDisplayBadges,
} from "@/lib/achievements/compute";

export {
  ACHIEVEMENT_FILTER_TABS,
  EARLY_ADOPTER_CUTOFF,
} from "@/lib/achievements/constants";

export {
  checkAndUnlockAchievements,
  annotateBuyTrade,
  evaluateAchievement,
  getRequirementText,
  loadAchievementCheckContext,
  buildAssetRankMap,
} from "@/lib/achievements/unlock";

export { ensureAchievementsSeeded } from "@/lib/achievements/seed";
export { loadAchievementsCatalog } from "@/lib/achievements/catalog";
export {
  ACHIEVEMENT_SEED,
  ACHIEVEMENT_SEED_COUNT,
  getHowToUnlock,
  getStaticAchievementsCatalog,
} from "@/lib/achievements/seed-data";
