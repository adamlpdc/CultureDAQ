export { AchievementBadgeGroup, AchievementBadgePill } from "@/components/achievements/achievement-badge";
export { AchievementCard } from "@/components/achievements/achievement-card";
export { AchievementGridCard } from "@/components/achievements/achievement-grid-card";
export { AchievementProvider, useAchievementToast } from "@/components/achievements/achievement-provider";
export { AchievementToast, AchievementToastStack } from "@/components/achievements/achievement-toast";
export { AchievementsExplorer } from "@/components/achievements/achievements-explorer";
export { AchievementsHighlights } from "@/components/achievements/achievements-highlights";
export { AchievementsPageHeader } from "@/components/achievements/achievements-page-header";
export { AchievementsSection } from "@/components/achievements/achievements-section";

export {
  buildAchievementHighlights,
  buildCompetitiveNudge,
  computeEarnedAchievements,
  computeUserAchievementSummary,
  getDisplayBadges,
} from "@/lib/achievements/compute";

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
