import Link from "next/link";
import type { UserAchievementStats } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface PortfolioAchievementsSummaryProps {
  stats: UserAchievementStats;
}

export function PortfolioAchievementsSummary({ stats }: PortfolioAchievementsSummaryProps) {
  return (
    <Link href="/achievements" className="group block">
      <Card className="!p-4 transition-shadow hover:shadow-card-hover">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Achievements
            </p>
            <p className="mt-1 text-sm font-bold text-foreground">
              {stats.earnedCount} unlocked · {stats.achievementScore.toLocaleString()} pts
            </p>
            <p className="mt-0.5 text-xs text-primary group-hover:underline">
              View achievements
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
}
