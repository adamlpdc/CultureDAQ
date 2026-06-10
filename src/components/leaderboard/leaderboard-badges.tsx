import type { LeaderboardBadge } from "@/lib/leaderboard-analytics";
import {
  AchievementBadgeGroup,
  AchievementBadgePill,
} from "@/components/achievements/achievement-badge";
import { cn } from "@/lib/utils";

export function LeaderboardBadgePill({
  badge,
  className,
}: {
  badge: LeaderboardBadge;
  className?: string;
}) {
  return (
    <AchievementBadgePill achievementId={badge} className={className} />
  );
}

export function LeaderboardBadgeGroup({
  badges,
  className,
}: {
  badges: LeaderboardBadge[];
  className?: string;
}) {
  return (
    <AchievementBadgeGroup achievementIds={badges} className={className} />
  );
}

export function RankMovement({
  change,
  className,
}: {
  change: number | null;
  className?: string;
}) {
  if (change == null || change === 0) {
    return (
      <span className={cn("text-[11px] font-semibold text-muted", className)}>—</span>
    );
  }
  const up = change > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-bold",
        up ? "text-gain" : "text-loss",
        className
      )}
    >
      {up ? "▲" : "▼"} {Math.abs(change)}
    </span>
  );
}
