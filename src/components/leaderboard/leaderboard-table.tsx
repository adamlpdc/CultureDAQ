import { Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@/types/database";
import { displayUsername, formatDaq } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

function rankStyle(rank: number) {
  if (rank === 1) return "bg-gold-light text-gold border-gold-muted";
  if (rank === 2) return "bg-surface-muted text-foreground-secondary border-border";
  if (rank === 3) return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-surface-muted text-muted border-border";
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No rankings yet"
        description="Leaderboard updates every 15 minutes. Start trading to claim your spot."
      />
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="divide-y divide-border">
        {entries.map((entry) => (
          <div
            key={entry.user_id}
            className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-muted/50 md:px-6"
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                rankStyle(entry.rank)
              )}
            >
              {entry.rank}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">
                {displayUsername(entry.username)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gold">{formatDaq(entry.total_value)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
