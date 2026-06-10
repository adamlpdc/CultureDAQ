import Link from "next/link";
import type { UserAchievementStats } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AchievementsSectionProps {
  stats: UserAchievementStats;
  isLoggedIn: boolean;
}

export function AchievementsSection({ stats, isLoggedIn }: AchievementsSectionProps) {
  return (
    <section id="achievements" aria-labelledby="achievements-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="achievements-heading" className="text-sm font-bold text-foreground">
            Achievements
          </h2>
          <p className="mt-0.5 text-[11px] text-muted">
            Earn points by trading, diversifying, and climbing the rankings.
          </p>
        </div>
        <Link
          href="/achievements"
          className="text-[11px] font-semibold text-primary hover:underline"
        >
          View all achievements
        </Link>
      </div>

      <Card className="!p-4">
        {isLoggedIn ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-foreground">
                {stats.earnedCount} unlocked · {stats.achievementScore.toLocaleString()} pts
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {stats.completionPercent}% complete
                {stats.latestAchievement
                  ? ` · Latest: ${stats.latestAchievement.icon} ${stats.latestAchievement.name}`
                  : ""}
              </p>
            </div>
            <Link href="/achievements">
              <Button size="sm" variant="secondary">
                View Achievements
              </Button>
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted">
            <Link href="/login?redirect=/leaderboard" className="font-semibold text-primary">
              Sign in
            </Link>{" "}
            to track achievements and compete for points.
          </p>
        )}
      </Card>
    </section>
  );
}
