import { Trophy } from "lucide-react";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { getLeaderboard } from "@/lib/queries";

export default async function LeaderboardPage() {
  const entries = await getLeaderboard(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gold/20 p-3">
          <Trophy className="h-6 w-6 text-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Leaderboard</h1>
          <p className="text-muted">
            Top traders ranked by total portfolio value
          </p>
        </div>
      </div>

      <LeaderboardTable entries={entries} />

      <p className="text-center text-xs text-muted">
        Rankings update every 15 minutes. DAQ has no real-world value — this is a
        game only.
      </p>
    </div>
  );
}
