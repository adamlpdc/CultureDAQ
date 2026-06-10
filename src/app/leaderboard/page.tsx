import { Suspense } from "react";
import { AchievementsSection } from "@/components/achievements/achievements-section";
import { LeaderboardHallOfFame } from "@/components/leaderboard/leaderboard-hall-of-fame";
import { LeaderboardHeader } from "@/components/leaderboard/leaderboard-header";
import { LeaderboardPodium } from "@/components/leaderboard/leaderboard-podium";
import { LeaderboardRankings } from "@/components/leaderboard/leaderboard-rankings";
import { LeaderboardTabs } from "@/components/leaderboard/leaderboard-tabs";
import { LeaderboardUserPosition } from "@/components/leaderboard/leaderboard-user-position";
import { LoadingSpinner } from "@/components/ui/loading";
import type { LeaderboardPeriod } from "@/lib/leaderboard-analytics";
import { getCurrentUser, getLeaderboardPageData, getUserAchievementStats } from "@/lib/queries";

interface LeaderboardPageProps {
  searchParams: Promise<{ period?: string }>;
}

function parsePeriod(value?: string): LeaderboardPeriod {
  if (value === "today" || value === "week" || value === "month" || value === "all") {
    return value;
  }
  return "all";
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const user = await getCurrentUser();
  const data = await getLeaderboardPageData(period, user?.id);
  const achievementStats = user
    ? await getUserAchievementStats(user.id)
    : {
        earnedCount: 0,
        achievementScore: 0,
        totalAchievements: 0,
        completionPercent: 0,
        latestAchievement: null,
        latestUnlockedAt: null,
      };

  const userEntry = user
    ? data.entries.find((e) => e.user_id === user.id)
    : undefined;

  return (
    <div className="space-y-4 md:space-y-5">
      <LeaderboardHeader stats={data.stats} />

      <LeaderboardUserPosition
        position={data.userPosition}
        isLoggedIn={!!user}
      />

      <Suspense fallback={<LoadingSpinner />}>
        <LeaderboardTabs active={period} />
      </Suspense>

      <LeaderboardPodium entries={data.entries.slice(0, 3)} />

      <LeaderboardRankings
        entries={data.entries}
        currentUserId={user?.id}
        userPosition={userEntry}
        showUserSticky={!!userEntry && userEntry.rank > 50}
      />

      <AchievementsSection stats={achievementStats} isLoggedIn={!!user} />

      <LeaderboardHallOfFame entries={data.hallOfFame} />

      <p className="pb-2 text-center text-[11px] text-muted">
        Friends leagues and seasonal championships — coming soon.
      </p>
    </div>
  );
}
