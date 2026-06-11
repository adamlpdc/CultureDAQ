import { redirect } from "next/navigation";
import { HoldingsList } from "@/components/portfolio/holdings-list";
import { PortfolioActivity } from "@/components/portfolio/portfolio-activity";
import { PortfolioAllocation } from "@/components/portfolio/portfolio-allocation";
import { PortfolioChart } from "@/components/portfolio/portfolio-chart";
import { PortfolioEmptyState } from "@/components/portfolio/portfolio-empty-state";
import { PortfolioHeader } from "@/components/portfolio/portfolio-header";
import { PortfolioInsights } from "@/components/portfolio/portfolio-insights";
import { PortfolioStats } from "@/components/portfolio/portfolio-stats";
import { PortfolioAchievementsSummary } from "@/components/portfolio/portfolio-achievements-summary";
import { PortfolioWatchlist } from "@/components/portfolio/portfolio-watchlist";
import type { AssetRankMovement } from "@/types/database";
import { getAssetRankMovementsMap } from "@/lib/asset-ranking";
import { computePortfolioAnalytics } from "@/lib/portfolio-analytics";
import { createClient } from "@/lib/supabase/server";
import { getUserWatchlist } from "@/lib/watchlist";
import {
  getCurrentUser,
  getPortfolioHistory,
  getPortfolioSummary,
  getUserAchievementStats,
  getUserHoldings,
  getUserPortfolioRank,
  getUserTrades,
} from "@/lib/queries";

export default async function PortfolioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/portfolio");

  const supabase = await createClient();

  const [summary, holdings, trades, history, watchlistItems, portfolioRank, achievementStats] =
    await Promise.all([
      getPortfolioSummary(user.id),
      getUserHoldings(user.id),
      getUserTrades(user.id, 10),
      getPortfolioHistory(user.id),
      getUserWatchlist(supabase, user.id),
      getUserPortfolioRank(user.id),
      getUserAchievementStats(user.id),
    ]);

  if (!summary) redirect("/login");

  const rankMovementsMap = await getAssetRankMovementsMap(
    supabase,
    watchlistItems.map((i) => ({
      id: i.asset_id,
      current_price: i.asset.current_price,
    }))
  );

  const rankMovements: Record<string, AssetRankMovement> = {};
  for (const [id, movement] of rankMovementsMap) {
    rankMovements[id] = movement;
  }

  const analytics = computePortfolioAnalytics(holdings, summary.total_value);
  const hasHoldings = holdings.length > 0;

  return (
    <div className="space-y-4 md:space-y-5">
      <PortfolioHeader
        summary={summary}
        totalReturnPercent={analytics.totalReturnPercent}
        portfolioRank={portfolioRank}
        categoriesCount={analytics.allocation.length}
      />

      <PortfolioChart data={history} currentValue={summary.total_value} />

      <PortfolioStats
        summary={summary}
        totalReturnPercent={analytics.totalReturnPercent}
        totalReturnDaq={analytics.totalReturnDaq}
        bestPerformer={analytics.bestPerformer}
        worstPerformer={
          analytics.worstPerformer && analytics.worstPerformer.returnPercent < 0
            ? analytics.worstPerformer
            : null
        }
      />

      <PortfolioAchievementsSummary stats={achievementStats} />

      {hasHoldings ? (
        <section>
          <h2 className="mb-3 text-sm font-bold text-foreground">Your Holdings</h2>
          <HoldingsList metrics={analytics.holdingMetrics} />
        </section>
      ) : (
        <PortfolioEmptyState />
      )}

      <PortfolioInsights
        metrics={analytics.holdingMetrics}
        allocation={analytics.allocation}
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <PortfolioAllocation allocation={analytics.allocation} />
        <PortfolioWatchlist
          items={watchlistItems}
          rankMovements={rankMovements}
          isLoggedIn
        />
      </div>

      <PortfolioActivity trades={trades} />
    </div>
  );
}
