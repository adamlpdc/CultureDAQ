import { Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@/types/database";
import { formatDaq } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No rankings yet"
        description="Leaderboard updates every 15 minutes after users start trading."
      />
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="divide-y divide-border">
        {entries.map((entry) => (
          <div
            key={entry.user_id}
            className="flex items-center gap-4 px-4 py-3 md:px-6"
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                entry.rank === 1
                  ? "bg-gold/20 text-gold"
                  : entry.rank === 2
                    ? "bg-gray-400/20 text-gray-300"
                    : entry.rank === 3
                      ? "bg-orange-700/20 text-orange-400"
                      : "bg-surface-elevated text-muted"
              }`}
            >
              {entry.rank}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">@{entry.username}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gold">
                {formatDaq(entry.total_value)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
