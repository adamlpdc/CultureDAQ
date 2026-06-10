import type { LeaderboardStats } from "@/lib/leaderboard-analytics";
import { formatDaq, formatPercent } from "@/lib/utils";

interface LeaderboardHeaderProps {
  stats: LeaderboardStats;
}

export function LeaderboardHeader({ stats }: LeaderboardHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-tint bg-surface p-4 shadow-elevated md:p-5">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gold-subtle/50 blur-3xl" />
      <div className="relative">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Leaderboard
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          See who is spotting momentum before the market.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/60 pt-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Total Traders
            </p>
            <p className="text-stat mt-0.5 text-sm font-bold text-foreground">
              {stats.totalTraders.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Highest Portfolio
            </p>
            <p className="text-stat daq-price mt-0.5 text-sm font-bold text-gold">
              {formatDaq(stats.highestPortfolio)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Largest Gain Today
            </p>
            <p className="text-stat mt-0.5 text-sm font-bold text-gain">
              {stats.largestGainToday > 0
                ? formatPercent(stats.largestGainToday)
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
