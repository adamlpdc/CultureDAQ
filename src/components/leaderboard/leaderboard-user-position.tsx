import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { UserLeaderboardPosition } from "@/lib/leaderboard-analytics";
import { TraderAvatar } from "@/components/leaderboard/trader-avatar";
import {
  LeaderboardBadgeGroup,
  RankMovement,
} from "@/components/leaderboard/leaderboard-badges";
import { Button } from "@/components/ui/button";
import { cn, formatDaq, formatPercent } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface LeaderboardUserPositionProps {
  position: UserLeaderboardPosition | null;
  isLoggedIn: boolean;
}

export function LeaderboardUserPosition({
  position,
  isLoggedIn,
}: LeaderboardUserPositionProps) {
  if (!isLoggedIn) {
    return (
      <Card className="flex flex-col items-center gap-3 !p-5 text-center sm:flex-row sm:text-left">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-xl">
          🏆
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">Sign in to compete</p>
          <p className="mt-0.5 text-xs text-muted">
            Track your rank, earn achievements, and climb the board.
          </p>
        </div>
        <Link href="/login?redirect=/leaderboard">
          <Button size="sm">Sign In</Button>
        </Link>
      </Card>
    );
  }

  if (!position) {
    return (
      <Card className="!p-4 text-center">
        <p className="text-sm text-muted">Start trading to appear on the leaderboard.</p>
        <Link href="/market" className="mt-3 inline-block">
          <Button size="sm">Explore Market</Button>
        </Link>
      </Card>
    );
  }

  const isDayPositive =
    position.changeTodayPercent != null && position.changeTodayPercent >= 0;

  return (
    <Card className="!p-4 md:!p-5">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-primary">
        Your Position
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <TraderAvatar username={position.username} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-stat text-2xl font-bold text-foreground">#{position.rank}</p>
            <RankMovement change={position.rankChange} />
          </div>
          <p className="truncate text-sm font-semibold text-foreground">
            @{position.username}
          </p>
          <LeaderboardBadgeGroup badges={position.badges} className="mt-1.5" />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:text-right lg:grid-cols-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Portfolio Value
            </p>
            <p className="text-stat daq-price text-sm font-bold text-foreground">
              {formatDaq(position.totalValue)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Total Return
            </p>
            <p
              className={cn(
                "text-sm font-bold",
                position.totalReturnPercent >= 0 ? "text-gain" : "text-loss"
              )}
            >
              {formatPercent(position.totalReturnPercent)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Change Today
            </p>
            <p
              className={cn(
                "flex items-center gap-0.5 text-sm font-bold sm:justify-end",
                position.changeTodayPercent == null
                  ? "text-muted"
                  : isDayPositive
                    ? "text-gain"
                    : "text-loss"
              )}
            >
              {position.changeTodayPercent != null && (
                <>
                  {isDayPositive ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {formatPercent(position.changeTodayPercent)}
                </>
              )}
              {position.changeTodayPercent == null && "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Achievements Earned
            </p>
            <p className="text-stat text-sm font-bold text-foreground">
              {position.achievementsEarned}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Achievement Score
            </p>
            <Link href="/achievements" className="text-stat text-sm font-bold text-gold hover:underline">
              {position.achievementScore.toLocaleString()} pts
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
