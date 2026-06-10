import Link from "next/link";
import type { UserAchievementStats } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AchievementsPageHeaderProps {
  stats: UserAchievementStats;
  isLoggedIn: boolean;
}

export function AchievementsPageHeader({ stats, isLoggedIn }: AchievementsPageHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-tint bg-surface p-4 shadow-elevated md:p-5">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gold-subtle/50 blur-3xl" />
      <div className="relative">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Achievements
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Unlock milestones as you trade, discover trends and climb the rankings.
        </p>

        {isLoggedIn ? (
          <div className="mt-4 border-t border-border/60 pt-4">
            <div className="rounded-xl border border-gold-muted/60 bg-gold-subtle/30 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gold">
                Achievement Score
              </p>
              <p className="text-stat mt-0.5 text-2xl font-bold text-foreground md:text-3xl">
                {stats.achievementScore.toLocaleString()}
                <span className="ml-1.5 text-sm font-bold text-gold">pts</span>
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Unlocked
                </p>
                <p className="text-stat mt-0.5 text-sm font-bold text-foreground">
                  {stats.earnedCount} / {stats.totalAchievements}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Completion
                </p>
                <p className="text-stat mt-0.5 text-sm font-bold text-foreground">
                  {stats.completionPercent}%
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Latest Achievement
                </p>
                <p className="mt-0.5 truncate text-sm font-bold text-foreground">
                  {stats.latestAchievement
                    ? `${stats.latestAchievement.icon} ${stats.latestAchievement.name}`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Card className="mt-4 !p-4">
            <p className="text-sm text-muted">
              <Link href="/login?redirect=/achievements" className="font-semibold text-primary">
                Sign in
              </Link>{" "}
              to track your achievement progress and build your score.
            </p>
            <Link href="/login?redirect=/achievements" className="mt-3 inline-block">
              <Button size="sm">Sign In</Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
