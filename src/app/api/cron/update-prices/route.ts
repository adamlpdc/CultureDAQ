import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAssetRankMovementsMap, recordAssetRankSnapshot } from "@/lib/asset-ranking";
import { generateAssetEvents } from "@/lib/market-events";
import {
  calculateNewPrice,
  calculateMomentumUpdate,
  decayPressure,
} from "@/lib/price-engine";
import type { Asset, AssetRankMovement, HoldingWithAsset, MarketEvent } from "@/types/database";
import type { WatchlistItemWithAsset } from "@/lib/watchlist";
import {
  getPreviousLeaderboardRankMap,
  getPreviousPortfolioTotal,
  processLeaderboardNotifications,
  processPortfolioNotifications,
  processWatchlistNotifications,
} from "@/lib/notifications/generators";
import {
  computeHoldingsValue,
  computeTotalPortfolioValue,
} from "@/lib/portfolio-value";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  const { data: assets, error } = await supabase.from("assets").select("*");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!assets || assets.length === 0) {
    return NextResponse.json({ message: "No assets to update", updated: 0 });
  }

  let updated = 0;
  const errors: string[] = [];

  for (const asset of assets as Asset[]) {
    try {
      const result = calculateNewPrice(asset, now);

      if (result.newPrice === result.oldPrice) continue;

      const newMomentum = calculateMomentumUpdate(asset, result.changePercent);

      await supabase
        .from("assets")
        .update({
          previous_price: result.oldPrice,
          current_price: result.newPrice,
          momentum_score: newMomentum,
          buy_pressure: decayPressure(Number(asset.buy_pressure)),
          sell_pressure: decayPressure(Number(asset.sell_pressure)),
        })
        .eq("id", asset.id);

      await supabase.from("asset_prices").insert({
        asset_id: asset.id,
        price: result.newPrice,
        recorded_at: now.toISOString(),
      });

      if (Math.abs(result.changePercent) >= 0.1) {
        await supabase.from("price_events").insert({
          asset_id: asset.id,
          old_price: result.oldPrice,
          new_price: result.newPrice,
          change_percent: result.changePercent,
          reason: result.reason,
          source: result.source,
          metadata: result.metadata,
        });
      }

      updated++;
    } catch (e) {
      errors.push(`${asset.slug}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }

  await supabase.rpc("decay_trade_volumes");

  let ranksRecorded = 0;
  let eventsGenerated = 0;
  let notificationsCreated = 0;
  let rankMovements = new Map<string, AssetRankMovement>();
  let recentMarketEvents: MarketEvent[] = [];
  try {
    const { data: rankedAssets } = await supabase
      .from("assets")
      .select("id, current_price");
    const rankResult = await recordAssetRankSnapshot(
      supabase,
      (rankedAssets ?? []) as Pick<Asset, "id" | "current_price">[],
      now.toISOString()
    );
    ranksRecorded = rankResult.recorded;
  } catch (e) {
    errors.push(
      `rank_snapshot: ${e instanceof Error ? e.message : "Unknown error"}`
    );
  }

  try {
    const { data: freshAssets } = await supabase.from("assets").select("*");
    rankMovements = await getAssetRankMovementsMap(
      supabase,
      (freshAssets ?? []) as Asset[]
    );
    const eventResult = await generateAssetEvents(supabase, {
      assets: (freshAssets ?? []) as Asset[],
      rankMovements,
      createdAt: now.toISOString(),
    });
    eventsGenerated = eventResult.generated;

    const { data: marketEvents } = await supabase
      .from("market_events")
      .select("*")
      .gte("created_at", new Date(now.getTime() - 20 * 60 * 1000).toISOString());
    recentMarketEvents = (marketEvents ?? []) as MarketEvent[];
  } catch (e) {
    errors.push(
      `market_events: ${e instanceof Error ? e.message : "Unknown error"}`
    );
  }

  const { data: profiles } = await supabase.from("profiles").select("*");

  if (profiles) {
    const previousLeaderboardRanks = await getPreviousLeaderboardRankMap(supabase);

    const { data: watchlistRows } = await supabase
      .from("watchlist_items")
      .select("*, asset:assets(*)");
    const watchlistItems = (watchlistRows ?? []).map((row) => ({
      ...(row as WatchlistItemWithAsset),
      asset: (row as { asset: Asset }).asset,
    })) as WatchlistItemWithAsset[];

    if (watchlistItems.length > 0) {
      try {
        notificationsCreated += await processWatchlistNotifications(
          supabase,
          watchlistItems,
          rankMovements,
          recentMarketEvents
        );
      } catch (e) {
        errors.push(
          `watchlist_notifications: ${e instanceof Error ? e.message : "Unknown error"}`
        );
      }
    }

    for (const profile of profiles) {
      const { data: holdings } = await supabase
        .from("holdings")
        .select("shares, asset:assets(current_price)")
        .eq("user_id", profile.user_id);

      const holdingsValue = computeHoldingsValue(
        (holdings ?? []).map((h) => ({
          shares: h.shares,
          asset: h.asset as unknown as { current_price: number },
        }))
      );

      const totalValue = computeTotalPortfolioValue(
        profile.daq_balance,
        holdingsValue
      );

      const previousTotal = await getPreviousPortfolioTotal(supabase, profile.user_id);

      const { data: holdingsWithAssets } = await supabase
        .from("holdings")
        .select("*, asset:assets(*)")
        .eq("user_id", profile.user_id);

      try {
        notificationsCreated += await processPortfolioNotifications(
          supabase,
          profile.user_id,
          previousTotal,
          totalValue,
          (holdingsWithAssets ?? []).map((h) => ({
            ...h,
            asset: (h as { asset: Asset }).asset,
          })) as HoldingWithAsset[]
        );
      } catch (e) {
        errors.push(
          `portfolio_notifications:${profile.username}: ${e instanceof Error ? e.message : "Unknown error"}`
        );
      }

      await supabase.from("portfolio_snapshots").insert({
        user_id: profile.user_id,
        total_value: totalValue,
        daq_balance: profile.daq_balance,
        holdings_value: holdingsValue,
        recorded_at: now.toISOString(),
      });
    }

    const leaderboard = await Promise.all(
      profiles.map(async (profile) => {
        const { data: holdings } = await supabase
          .from("holdings")
          .select("shares, asset:assets(current_price)")
          .eq("user_id", profile.user_id);

        const holdingsValue = computeHoldingsValue(
          (holdings ?? []).map((h) => ({
            shares: h.shares,
            asset: h.asset as unknown as { current_price: number },
          }))
        );

        return {
          user_id: profile.user_id,
          username: profile.username,
          total_value: computeTotalPortfolioValue(profile.daq_balance, holdingsValue),
        };
      })
    );

    const ranked = leaderboard
      .sort((a, b) => b.total_value - a.total_value)
      .map((entry, i) => ({
        ...entry,
        rank: i + 1,
        recorded_at: now.toISOString(),
      }));

    if (ranked.length > 0) {
      try {
        notificationsCreated += await processLeaderboardNotifications(
          supabase,
          ranked,
          previousLeaderboardRanks
        );
      } catch (e) {
        errors.push(
          `leaderboard_notifications: ${e instanceof Error ? e.message : "Unknown error"}`
        );
      }

      await supabase.from("leaderboard_snapshots").insert(ranked);
    }
  }

  return NextResponse.json({
    message: "Price update complete",
    updated,
    ranksRecorded,
    eventsGenerated,
    notificationsCreated,
    total: assets.length,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: now.toISOString(),
  });
}
