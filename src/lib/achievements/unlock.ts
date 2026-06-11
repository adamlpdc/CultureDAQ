import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Achievement,
  Asset,
  HoldingWithAsset,
  Profile,
  TradeWithAsset,
  UnlockedAchievement,
  UserAchievement,
} from "@/types/database";
import { EARLY_ADOPTER_CUTOFF } from "@/lib/achievements/constants";
import { getHowToUnlock } from "@/lib/achievements/seed-data";
import { getAchievementRarity } from "@/lib/achievements/rarity";
import { loadAchievementsCatalog } from "@/lib/achievements/catalog";
import { createNotification } from "@/lib/notifications";
import { buildAchievementNotificationInput } from "@/lib/notifications/generators";
import { computePortfolioValueFromHoldings } from "@/lib/portfolio-value";

export interface AchievementCheckContext {
  userId: string;
  profile: Profile;
  holdings: HoldingWithAsset[];
  trades: TradeWithAsset[];
  portfolioValue: number;
  leaderboardRank: number | null;
  assetRankMap: Map<string, number>;
  allAssets: Asset[];
}

export interface ProgressResult {
  progress: number;
  qualified: boolean;
}

function clampProgress(value: number, target: number): number {
  if (target <= 0) return value > 0 ? 100 : 0;
  return Math.min(100, Math.round((value / target) * 100));
}

function isProfitable(holding: HoldingWithAsset): boolean {
  return holding.shares > 0 && holding.asset.current_price > holding.avg_cost;
}

function countByCategory(holdings: HoldingWithAsset[], category: string): number {
  return holdings.filter((h) => h.shares > 0 && h.asset.category === category).length;
}

function getBuyTrades(trades: TradeWithAsset[]) {
  return trades.filter((t) => t.trade_type === "buy");
}

function checkDiscoveryRank(
  ctx: AchievementCheckContext,
  maxRank: number
): ProgressResult {
  for (const holding of ctx.holdings) {
    if (holding.shares <= 0) continue;
    const currentRank = ctx.assetRankMap.get(holding.asset_id);
    if (currentRank == null || currentRank > maxRank) continue;

    const buyTrades = getBuyTrades(ctx.trades).filter(
      (t) => t.asset_id === holding.asset_id
    );
    if (buyTrades.length === 0) continue;

    const earliestBuy = buyTrades.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];

    const rankAtBuy = earliestBuy.asset_market_rank;
    if (rankAtBuy != null && rankAtBuy > maxRank) {
      return { progress: 100, qualified: true };
    }
  }
  return { progress: 0, qualified: false };
}

function checkContrarian(ctx: AchievementCheckContext): ProgressResult {
  for (const holding of ctx.holdings) {
    if (!isProfitable(holding)) continue;
    const downBuys = getBuyTrades(ctx.trades).filter(
      (t) => t.asset_id === holding.asset_id && t.asset_was_down
    );
    if (downBuys.length > 0) {
      return { progress: 100, qualified: true };
    }
  }
  return { progress: 0, qualified: false };
}

function checkPerfectTiming(ctx: AchievementCheckContext): ProgressResult {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const holding of ctx.holdings) {
    if (holding.shares <= 0) continue;
    const currentRank = ctx.assetRankMap.get(holding.asset_id);
    if (currentRank == null || currentRank > 10) continue;

    const buyTrades = getBuyTrades(ctx.trades)
      .filter((t) => t.asset_id === holding.asset_id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    for (const buy of buyTrades) {
      const buyTime = new Date(buy.created_at).getTime();
      const rankAtBuy = buy.asset_market_rank;
      if (rankAtBuy != null && rankAtBuy > 10 && now - buyTime <= dayMs) {
        return { progress: 100, qualified: true };
      }
    }
  }
  return { progress: 0, qualified: false };
}

function checkHoldDays(ctx: AchievementCheckContext, days: number): ProgressResult {
  const requiredMs = days * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let bestProgress = 0;

  for (const holding of ctx.holdings) {
    if (holding.shares <= 0) continue;
    const heldMs = now - new Date(holding.created_at).getTime();
    const progress = clampProgress(heldMs, requiredMs);
    bestProgress = Math.max(bestProgress, progress);
    if (heldMs >= requiredMs) {
      return { progress: 100, qualified: true };
    }
  }
  return { progress: bestProgress, qualified: bestProgress >= 100 };
}

export function evaluateAchievement(
  achievement: Achievement,
  ctx: AchievementCheckContext
): ProgressResult {
  const req = achievement.requirement_value ?? {};
  const holdings = ctx.holdings.filter((h) => h.shares > 0);
  const buyCount = getBuyTrades(ctx.trades).length;
  const tradeCount = ctx.trades.length;
  const profitableCount = holdings.filter(isProfitable).length;
  const uniqueAssets = holdings.length;
  const uniqueCategories = new Set(holdings.map((h) => h.asset.category)).size;

  switch (achievement.requirement_type) {
    case "trade_count": {
      const target = Number(req.count ?? 1);
      return {
        progress: clampProgress(tradeCount, target),
        qualified: tradeCount >= target,
      };
    }
    case "buy_count": {
      const target = Number(req.count ?? 1);
      return {
        progress: clampProgress(buyCount, target),
        qualified: buyCount >= target,
      };
    }
    case "profitable_holding": {
      const target = Number(req.count ?? 1);
      return {
        progress: clampProgress(profitableCount, target),
        qualified: profitableCount >= target,
      };
    }
    case "unique_assets": {
      const target = Number(req.count ?? 1);
      return {
        progress: clampProgress(uniqueAssets, target),
        qualified: uniqueAssets >= target,
      };
    }
    case "unique_categories": {
      const target = Number(req.count ?? 1);
      return {
        progress: clampProgress(uniqueCategories, target),
        qualified: uniqueCategories >= target,
      };
    }
    case "portfolio_value": {
      const target = Number(req.value ?? 0);
      return {
        progress: clampProgress(ctx.portfolioValue, target),
        qualified: ctx.portfolioValue >= target,
      };
    }
    case "leaderboard_rank": {
      const target = Number(req.rank ?? 100);
      if (ctx.leaderboardRank == null) {
        return { progress: 0, qualified: false };
      }
      const qualified = ctx.leaderboardRank <= target;
      const progress = qualified
        ? 100
        : Math.max(0, Math.round(((target - ctx.leaderboardRank) / target) * 100));
      return { progress: Math.min(99, progress), qualified };
    }
    case "category_holdings": {
      const category = String(req.category ?? "");
      const target = Number(req.count ?? 1);
      const count = countByCategory(holdings, category);
      return {
        progress: clampProgress(count, target),
        qualified: count >= target,
      };
    }
    case "profitable_holdings": {
      const target = Number(req.count ?? 1);
      return {
        progress: clampProgress(profitableCount, target),
        qualified: profitableCount >= target,
      };
    }
    case "all_holdings_profitable": {
      if (holdings.length === 0) return { progress: 0, qualified: false };
      const allGreen = holdings.every(isProfitable);
      return { progress: allGreen ? 100 : Math.round((profitableCount / holdings.length) * 100), qualified: allGreen };
    }
    case "early_adopter": {
      const joined = new Date(ctx.profile.created_at).getTime();
      const qualified = joined <= EARLY_ADOPTER_CUTOFF.getTime();
      return { progress: qualified ? 100 : 0, qualified };
    }
    case "discovery_rank": {
      return checkDiscoveryRank(ctx, Number(req.rank ?? 50));
    }
    case "hold_days": {
      return checkHoldDays(ctx, Number(req.days ?? 30));
    }
    case "contrarian": {
      return checkContrarian(ctx);
    }
    case "perfect_timing": {
      return checkPerfectTiming(ctx);
    }
    default:
      return { progress: 0, qualified: false };
  }
}

export function getRequirementText(achievement: Achievement): string {
  return getHowToUnlock(achievement.code, achievement.description);
}

export async function buildAssetRankMap(
  supabase: SupabaseClient
): Promise<Map<string, number>> {
  const { data: assets } = await supabase
    .from("assets")
    .select("id, current_price");

  const { buildAssetRankMap: rankMapFromAssets } = await import(
    "@/lib/asset-ranking"
  );
  return rankMapFromAssets((assets ?? []) as Pick<Asset, "id" | "current_price">[]);
}

export async function loadAchievementCheckContext(
  supabase: SupabaseClient,
  userId: string
): Promise<AchievementCheckContext | null> {
  const [{ data: profile }, { data: holdings }, { data: trades }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).single(),
    supabase
      .from("holdings")
      .select("*, asset:assets(*)")
      .eq("user_id", userId)
      .gt("shares", 0),
    supabase
      .from("trades")
      .select("*, asset:assets(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  if (!profile) return null;

  const typedHoldings = (holdings ?? []) as HoldingWithAsset[];
  const typedTrades = (trades ?? []) as TradeWithAsset[];

  const portfolioValue = computePortfolioValueFromHoldings(
    Number(profile.daq_balance),
    typedHoldings
  );

  const assetRankMap = await buildAssetRankMap(supabase);

  let leaderboardRank: number | null = null;
  const { data: snapshotBatch } = await supabase
    .from("leaderboard_snapshots")
    .select("recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapshotBatch) {
    const { data: rankRow } = await supabase
      .from("leaderboard_snapshots")
      .select("rank")
      .eq("recorded_at", snapshotBatch.recorded_at)
      .eq("user_id", userId)
      .maybeSingle();
    if (rankRow) leaderboardRank = rankRow.rank;
  }

  const { data: allAssets } = await supabase.from("assets").select("*");

  return {
    userId,
    profile: profile as Profile,
    holdings: typedHoldings,
    trades: typedTrades,
    portfolioValue,
    leaderboardRank,
    assetRankMap,
    allAssets: (allAssets ?? []) as Asset[],
  };
}

export async function checkAndUnlockAchievements(
  supabase: SupabaseClient,
  userId: string
): Promise<UnlockedAchievement[]> {
  const ctx = await loadAchievementCheckContext(supabase, userId);
  if (!ctx) return [];

  const achievements = await loadAchievementsCatalog(supabase);

  if (!achievements.length) return [];

  const [{ data: existingRows }, { data: dbAchievements }] = await Promise.all([
    supabase
      .from("user_achievements")
      .select("*, achievement:achievements(id, code)")
      .eq("user_id", userId),
    supabase.from("achievements").select("id, code"),
  ]);

  const existingById = new Map<string, UserAchievement>();
  const existingByCode = new Map<string, UserAchievement>();
  for (const row of existingRows ?? []) {
    const typed = row as UserAchievement & {
      achievement?: { id?: string; code?: string } | null;
    };
    existingById.set(typed.achievement_id, typed);
    const code = typed.achievement?.code;
    if (code) existingByCode.set(code, typed);
    const linkedId = typed.achievement?.id;
    if (linkedId) existingById.set(linkedId, typed);
  }

  const codeToDbId = new Map(
    (dbAchievements ?? []).map((row) => [row.code, row.id] as const)
  );

  const newlyUnlocked: UnlockedAchievement[] = [];
  const now = new Date().toISOString();

  for (const raw of achievements) {
    const achievement = raw;
    const dbAchievementId = codeToDbId.get(achievement.code) ?? achievement.id;
    const existing =
      existingById.get(dbAchievementId) ??
      existingByCode.get(achievement.code) ??
      existingById.get(achievement.id);
    if (existing?.is_unlocked) continue;

    const { progress, qualified } = evaluateAchievement(achievement, ctx);

    if (existing) {
      if (qualified) {
        const { error } = await supabase
          .from("user_achievements")
          .update({
            progress: 100,
            is_unlocked: true,
            unlocked_at: now,
          })
          .eq("id", existing.id)
          .eq("is_unlocked", false);

        if (!error) {
          const unlocked: UnlockedAchievement = {
            code: achievement.code,
            name: achievement.name,
            icon: achievement.icon,
            points: achievement.points,
            rarity: achievement.rarity ?? getAchievementRarity(achievement.code),
            unlockedAt: now,
          };
          newlyUnlocked.push(unlocked);
          try {
            await createNotification(
              supabase,
              buildAchievementNotificationInput(
                userId,
                unlocked,
                dbAchievementId,
                achievement.description ?? getHowToUnlock(achievement.code)
              )
            );
          } catch {
            /* notifications table may not be migrated yet */
          }
        }
      } else if (progress !== existing.progress) {
        await supabase
          .from("user_achievements")
          .update({ progress })
          .eq("id", existing.id);
      }
    } else if (qualified) {
      const { error } = await supabase.from("user_achievements").insert({
        user_id: userId,
        achievement_id: dbAchievementId,
        progress: 100,
        is_unlocked: true,
        unlocked_at: now,
      });

      if (!error) {
        const unlocked: UnlockedAchievement = {
          code: achievement.code,
          name: achievement.name,
          icon: achievement.icon,
          points: achievement.points,
          rarity: achievement.rarity ?? getAchievementRarity(achievement.code),
          unlockedAt: now,
        };
        newlyUnlocked.push(unlocked);
        try {
          await createNotification(
            supabase,
            buildAchievementNotificationInput(
              userId,
              unlocked,
              dbAchievementId,
              achievement.description ?? getHowToUnlock(achievement.code)
            )
          );
        } catch {
          /* notifications table may not be migrated yet */
        }
      }
    } else if (progress > 0) {
      await supabase.from("user_achievements").insert({
        user_id: userId,
        achievement_id: dbAchievementId,
        progress,
        is_unlocked: false,
      });
    }
  }

  return newlyUnlocked;
}

export async function annotateBuyTrade(
  supabase: SupabaseClient,
  tradeId: string,
  assetId: string
): Promise<void> {
  const assetRankMap = await buildAssetRankMap(supabase);
  const rank = assetRankMap.get(assetId) ?? null;

  const { data: asset } = await supabase
    .from("assets")
    .select("current_price, previous_price")
    .eq("id", assetId)
    .single();

  const wasDown =
    asset != null && Number(asset.current_price) < Number(asset.previous_price);

  await supabase
    .from("trades")
    .update({
      asset_market_rank: rank,
      asset_was_down: wasDown,
    })
    .eq("id", tradeId);
}
