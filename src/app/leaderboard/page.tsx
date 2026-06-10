import { Trophy } from "lucide-react";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { PageHeader } from "@/components/ui/page-header";
import { getLeaderboard } from "@/lib/queries";

export default async function LeaderboardPage() {
  const entries = await getLeaderboard(50);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-gold-subtle p-3 shadow-card">
          <Trophy className="h-7 w-7 text-gold" />
        </div>
        <PageHeader
          title="Leaderboard"
          description="Top traders ranked by total portfolio value. Updated every 15 minutes."
        />
      </div>

      <LeaderboardTable entries={entries} />
    </div>
  );
}
