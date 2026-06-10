import Link from "next/link";
import type { EnrichedLeaderboardEntry } from "@/lib/leaderboard-analytics";
import { buildCompetitiveNudge } from "@/lib/achievements";
import { TraderAvatar } from "@/components/leaderboard/trader-avatar";
import {
  LeaderboardBadgeGroup,
  RankMovement,
} from "@/components/leaderboard/leaderboard-badges";
import { Button } from "@/components/ui/button";
import { cn, formatDaq, formatPercent } from "@/lib/utils";
import { Card } from "@/components/ui/card";

function rankStyle(rank: number) {
  if (rank === 1) return "bg-gold-subtle text-gold border-gold-muted";
  if (rank === 2) return "bg-surface-muted text-foreground-secondary border-border";
  if (rank === 3) return "bg-gold-light text-gold-hover border-gold-muted";
  return "bg-surface-muted text-muted border-border";
}

function RankingRow({
  entry,
  isCurrentUser,
}: {
  entry: EnrichedLeaderboardEntry;
  isCurrentUser?: boolean;
}) {
  const isPositive = entry.totalReturnPercent >= 0;
  const periodPositive =
    entry.periodChangePercent != null && entry.periodChangePercent >= 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 transition-colors md:gap-4 md:px-5",
        isCurrentUser
          ? "bg-primary-light/40 ring-1 ring-inset ring-primary-muted"
          : "hover:bg-surface-muted/40"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold md:h-9 md:w-9",
          rankStyle(entry.rank)
        )}
      >
        {entry.rank}
      </div>
      <RankMovement change={entry.rankChange} className="hidden w-8 shrink-0 sm:inline-flex" />
      <TraderAvatar username={entry.username} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          @{entry.username}
          {isCurrentUser && (
            <span className="ml-1.5 text-[10px] font-bold uppercase text-primary">
              You
            </span>
          )}
        </p>
        <LeaderboardBadgeGroup badges={entry.badges} className="mt-0.5" />
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-stat daq-price text-sm font-bold text-foreground">
          {formatDaq(entry.total_value)}
        </p>
        <p className="text-[10px] text-muted">Portfolio</p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "text-xs font-bold md:text-sm",
            isPositive ? "text-gain" : "text-loss"
          )}
        >
          {formatPercent(entry.totalReturnPercent)}
        </p>
        <p className="text-[10px] text-muted">Return</p>
      </div>
      <div className="hidden shrink-0 text-right md:block">
        <p
          className={cn(
            "text-xs font-bold",
            entry.periodChangePercent == null
              ? "text-muted"
              : periodPositive
                ? "text-gain"
                : "text-loss"
          )}
        >
          {entry.periodChangePercent != null
            ? formatPercent(entry.periodChangePercent)
            : "—"}
        </p>
        <p className="text-[10px] text-muted">Change</p>
      </div>
    </div>
  );
}

interface LeaderboardRankingsProps {
  entries: EnrichedLeaderboardEntry[];
  currentUserId?: string | null;
  userPosition?: EnrichedLeaderboardEntry | null;
  showUserSticky?: boolean;
}

export function LeaderboardRankings({
  entries,
  currentUserId,
  userPosition,
  showUserSticky = false,
}: LeaderboardRankingsProps) {
  const nudge = buildCompetitiveNudge(entries.length);
  const userInList = entries.some((e) => e.user_id === currentUserId);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-foreground">Rankings</h2>
          {nudge && (
            <p className="mt-0.5 text-[11px] font-medium text-primary">{nudge}</p>
          )}
        </div>
        <p className="text-[11px] text-muted">Updated every 15 minutes</p>
      </div>

      {showUserSticky && userPosition && !userInList && (
        <Card className="mb-3 overflow-hidden !p-0">
          <div className="border-b border-border/60 bg-primary-light/20 px-4 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
              Your Position · #{userPosition.rank}
            </p>
          </div>
          <RankingRow entry={userPosition} isCurrentUser />
        </Card>
      )}

      <Card className="overflow-hidden !p-0">
        <div className="hidden border-b border-border/60 bg-surface-muted/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-muted md:grid md:grid-cols-[2.5rem_2rem_2.5rem_1fr_6rem_5rem_5rem] md:items-center md:gap-4 md:px-5">
          <span>Rank</span>
          <span className="hidden sm:inline">Move</span>
          <span className="col-span-2">Trader</span>
          <span className="hidden text-right sm:block">Portfolio</span>
          <span className="text-right">Return</span>
          <span className="hidden text-right md:block">Change</span>
        </div>
        {entries.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-semibold text-foreground">No traders ranked yet</p>
            <p className="mt-1 text-xs text-muted">
              Be the first to trade and claim rank #1.
            </p>
            <Link href="/market" className="mt-4 inline-block">
              <Button size="sm">Start Trading</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {entries.map((entry) => (
              <RankingRow
                key={entry.user_id}
                entry={entry}
                isCurrentUser={entry.user_id === currentUserId}
              />
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
