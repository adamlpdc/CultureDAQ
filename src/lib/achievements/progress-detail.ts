import type { Achievement } from "@/types/database";
import type { AchievementCheckContext } from "@/lib/achievements/unlock";
import { evaluateAchievement } from "@/lib/achievements/unlock";

export interface AchievementProgressDetail {
  progress: number;
  summary: string;
  metricLabel: string;
  currentDisplay: string;
  targetDisplay: string;
}

function formatDaq(value: number): string {
  return `${Math.round(value).toLocaleString()} DAQ`;
}

export function getAchievementProgressDetail(
  achievement: Achievement,
  ctx: AchievementCheckContext | null
): AchievementProgressDetail {
  if (!ctx) {
    return {
      progress: 0,
      summary: "Sign in and start playing to track progress",
      metricLabel: "Progress",
      currentDisplay: "—",
      targetDisplay: "—",
    };
  }

  const { progress, qualified } = evaluateAchievement(achievement, ctx);
  const req = achievement.requirement_value ?? {};
  const holdings = ctx.holdings.filter((h) => h.shares > 0);
  const tradeCount = ctx.trades.length;
  const buyCount = ctx.trades.filter((t) => t.trade_type === "buy").length;
  const profitableCount = holdings.filter(
    (h) => h.shares > 0 && h.asset.current_price > h.avg_cost
  ).length;
  const uniqueAssets = holdings.length;
  const uniqueCategories = new Set(holdings.map((h) => h.asset.category)).size;

  if (qualified) {
    return {
      progress: 100,
      summary: "Completed",
      metricLabel: "Status",
      currentDisplay: "Unlocked",
      targetDisplay: "✓",
    };
  }

  switch (achievement.requirement_type) {
    case "trade_count": {
      const target = Number(req.count ?? 1);
      return {
        progress,
        summary: `${tradeCount} / ${target} Trades`,
        metricLabel: "Trades",
        currentDisplay: String(tradeCount),
        targetDisplay: String(target),
      };
    }
    case "buy_count": {
      const target = Number(req.count ?? 1);
      return {
        progress,
        summary: `${buyCount} / ${target} Buys`,
        metricLabel: "Buys",
        currentDisplay: String(buyCount),
        targetDisplay: String(target),
      };
    }
    case "unique_assets": {
      const target = Number(req.count ?? 1);
      return {
        progress,
        summary: `${uniqueAssets} / ${target} Assets`,
        metricLabel: "Assets",
        currentDisplay: String(uniqueAssets),
        targetDisplay: String(target),
      };
    }
    case "unique_categories": {
      const target = Number(req.count ?? 1);
      return {
        progress,
        summary: `${uniqueCategories} / ${target} Categories`,
        metricLabel: "Categories",
        currentDisplay: String(uniqueCategories),
        targetDisplay: String(target),
      };
    }
    case "portfolio_value": {
      const target = Number(req.value ?? 0);
      return {
        progress,
        summary: `${formatDaq(ctx.portfolioValue)} / ${formatDaq(target)}`,
        metricLabel: "Portfolio",
        currentDisplay: formatDaq(ctx.portfolioValue),
        targetDisplay: formatDaq(target),
      };
    }
    case "leaderboard_rank": {
      const target = Number(req.rank ?? 100);
      const rank = ctx.leaderboardRank;
      if (rank == null) {
        return {
          progress: 0,
          summary: "Not ranked yet",
          metricLabel: "Rank",
          currentDisplay: "—",
          targetDisplay: `Top ${target}`,
        };
      }
      return {
        progress,
        summary: rank <= target ? `Top ${target}` : `#${rank} → Top ${target}`,
        metricLabel: "Rank",
        currentDisplay: `#${rank}`,
        targetDisplay: `Top ${target}`,
      };
    }
    case "category_holdings": {
      const category = String(req.category ?? "");
      const target = Number(req.count ?? 1);
      const count = holdings.filter((h) => h.asset.category === category).length;
      return {
        progress,
        summary: `${count} / ${target} Assets`,
        metricLabel: "Category",
        currentDisplay: String(count),
        targetDisplay: String(target),
      };
    }
    case "profitable_holding":
    case "profitable_holdings": {
      const target = Number(req.count ?? 1);
      return {
        progress,
        summary: `${profitableCount} / ${target} In Profit`,
        metricLabel: "Profitable",
        currentDisplay: String(profitableCount),
        targetDisplay: String(target),
      };
    }
    case "all_holdings_profitable": {
      const total = holdings.length;
      return {
        progress,
        summary: total === 0 ? "No holdings yet" : `${profitableCount} / ${total} In Profit`,
        metricLabel: "Holdings",
        currentDisplay: String(profitableCount),
        targetDisplay: total === 0 ? "All" : String(total),
      };
    }
    case "hold_days": {
      const target = Number(req.days ?? 30);
      let bestDays = 0;
      for (const h of holdings) {
        const days = Math.floor(
          (Date.now() - new Date(h.created_at).getTime()) / (24 * 60 * 60 * 1000)
        );
        bestDays = Math.max(bestDays, days);
      }
      return {
        progress,
        summary: `${bestDays} / ${target} Days`,
        metricLabel: "Hold Duration",
        currentDisplay: `${bestDays}d`,
        targetDisplay: `${target}d`,
      };
    }
    case "early_adopter":
      return {
        progress,
        summary: progress >= 100 ? "Qualified" : "Not eligible",
        metricLabel: "Eligibility",
        currentDisplay: progress >= 100 ? "Yes" : "No",
        targetDisplay: "Early user",
      };
    case "discovery_rank":
    case "contrarian":
    case "perfect_timing":
      return {
        progress,
        summary: progress > 0 ? `${progress}% toward unlock` : "Not started",
        metricLabel: "Progress",
        currentDisplay: progress > 0 ? "In progress" : "—",
        targetDisplay: achievement.name,
      };
    default:
      return {
        progress,
        summary: `${progress}% complete`,
        metricLabel: "Progress",
        currentDisplay: `${progress}%`,
        targetDisplay: "100%",
      };
  }
}
