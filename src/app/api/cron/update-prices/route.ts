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
import { MARKET_DRIFT_WARNING_PERCENT_PER_DAY } from "@/lib/constants";
import { isMarketEngineV2Enabled } from "@/lib/env";
import {
  calculateMarketEngineV2,
  type MarketEngineV2EventSignal,
} from "@/lib/market-engine-v2";

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

  const { data: engineControl } = await supabase
    .from("market_engine_controls")
    .select("paused, pause_reason")
    .eq("id", "production")
    .maybeSingle();
  if (engineControl?.paused) {
    return NextResponse.json({
      message: "Market engine paused",
      reason: engineControl.pause_reason,
      updated: 0,
      timestamp: now.toISOString(),
    });
  }

  const { data: assets, error } = await supabase.from("assets").select("*");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!assets || assets.length === 0) {
    return NextResponse.json({ message: "No assets to update", updated: 0 });
  }

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const { data: anchorRows, error: anchorError } = await supabase.rpc(
    "get_asset_prices_24h_anchor",
    { p_as_of: now.toISOString() }
  );
  if (anchorError) {
    errors.push(`24h_anchors: ${anchorError.message}`);
  }
  const price24hAgo = new Map<string, number>(
    ((anchorRows ?? []) as Array<{ asset_id: string; anchor_price: number }>).map(
      (row) => [row.asset_id, Number(row.anchor_price)]
    )
  );

  let engineRunId: string | null = null;
  const useV2 = isMarketEngineV2Enabled();
  if (useV2) {
    const tickMs = 15 * 60 * 1000;
    const tickKey = new Date(Math.floor(now.getTime() / tickMs) * tickMs).toISOString();
    const { data: runRows, error: runError } = await supabase.rpc(
      "begin_market_engine_v2_run",
      { p_tick_key: tickKey }
    );
    if (runError) {
      return NextResponse.json({ error: runError.message }, { status: 500 });
    }
    const run = (runRows as Array<{ run_id: string; run_status: string; created: boolean }> | null)?.[0];
    if (!run) return NextResponse.json({ error: "Unable to acquire v2 cron run" }, { status: 500 });
    if (!run.created) {
      return NextResponse.json({
        message: "Duplicate cron execution skipped",
        engine: "v2",
        runId: run.run_id,
        status: run.run_status,
        tickKey,
      });
    }
    engineRunId = run.run_id;

    const [
      { data: expectationRows, error: expectationError },
      { data: cultureRows, error: cultureError },
      { data: consumedRows, error: consumedError },
    ] = await Promise.all([
      supabase.from("asset_expectations").select("asset_slug, expectation_score"),
      supabase
        .from("culture_events")
        .select("id, title, affected_assets, confidence, expected_attention, actual_attention, surprise_delta, momentum_score, viral_multiplier, decay_rate, resolved_at, is_verified, status")
        .not("resolved_at", "is", null)
        .gte("resolved_at", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .neq("status", "archived")
        .order("resolved_at", { ascending: false }),
      supabase
        .from("market_engine_v2_calculations")
        .select("asset_id, culture_event_id")
        .not("culture_event_id", "is", null)
        .gte("calculated_at", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);
    if (expectationError) errors.push(`asset_expectations: ${expectationError.message}`);
    if (cultureError) errors.push(`culture_events: ${cultureError.message}`);
    if (consumedError) errors.push(`event_consumptions: ${consumedError.message}`);

    const expectationBySlug = new Map<string, number>(
      (expectationRows ?? []).map((row) => [row.asset_slug, Number(row.expectation_score)])
    );
    const eventsBySlug = new Map<string, MarketEngineV2EventSignal[]>();
    for (const row of cultureRows ?? []) {
      if (row.actual_attention == null || row.surprise_delta == null || row.momentum_score == null || row.viral_multiplier == null) continue;
      const event: MarketEngineV2EventSignal = {
        id: row.id,
        title: row.title,
        verified: Boolean(row.is_verified),
        confidence: Number(row.confidence),
        expectedAttention: Number(row.expected_attention),
        actualAttention: Number(row.actual_attention),
        surpriseDelta: Number(row.surprise_delta),
        momentumScore: Number(row.momentum_score),
        viralMultiplier: Number(row.viral_multiplier),
        decayMultiplier: Math.exp(
          -Math.max(0, now.getTime() - new Date(row.resolved_at!).getTime()) /
            (60 * 60 * 1000) * Number(row.decay_rate)
        ),
      };
      for (const affected of (row.affected_assets ?? []) as Array<{ slug?: string }>) {
        if (!affected.slug) continue;
        const events = eventsBySlug.get(affected.slug) ?? [];
        events.push(event);
        eventsBySlug.set(affected.slug, events);
      }
    }
    const consumedEvents = new Set(
      (consumedRows ?? []).map((row) => `${row.asset_id}:${row.culture_event_id}`)
    );

    for (const asset of assets as Asset[]) {
      try {
        const input = {
          assetId: asset.id,
          assetSlug: asset.slug,
          assetName: asset.name,
          oldPrice: Number(asset.current_price),
          price24hAgo: price24hAgo.get(asset.id) ?? null,
          expectationScore: expectationBySlug.get(asset.slug) ?? 0,
          signedMomentum: Number(asset.momentum_score),
          buyPressure: Number(asset.buy_pressure),
          sellPressure: Number(asset.sell_pressure),
          tradeVolume24h: Number(asset.trade_volume_24h),
          event: (eventsBySlug.get(asset.slug) ?? []).find(
            (event) => !consumedEvents.has(`${asset.id}:${event.id}`)
          ) ?? null,
          calculatedAt: now.toISOString(),
        };
        const result = calculateMarketEngineV2(input);
        const { data: applied, error: applyError } = await supabase.rpc(
          "apply_market_engine_v2_calculation",
          {
            p_run_id: engineRunId,
            p_asset_id: asset.id,
            p_event_id: input.event?.id ?? null,
            p_input: input,
            p_output: result,
          }
        );
        if (applyError) throw applyError;
        if (applied && result.material) updated++;
        else skipped++;
      } catch (e) {
        errors.push(`${asset.slug}: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }
  } else {
    for (const asset of assets as Asset[]) {
      try {
        const result = calculateNewPrice(asset, now, {
          price24hAgo: price24hAgo.get(asset.id) ?? null,
        });
        if (result.newPrice === result.oldPrice) { skipped++; continue; }
        const newMomentum = calculateMomentumUpdate(asset, result.changePercent);
        await supabase.from("assets").update({
          previous_price: result.oldPrice,
          current_price: result.newPrice,
          momentum_score: newMomentum,
          buy_pressure: decayPressure(Number(asset.buy_pressure)),
          sell_pressure: decayPressure(Number(asset.sell_pressure)),
        }).eq("id", asset.id);
        await supabase.from("asset_prices").insert({
          asset_id: asset.id, price: result.newPrice, recorded_at: now.toISOString(),
        });
        await supabase.from("price_events").insert({
          asset_id: asset.id, old_price: result.oldPrice, new_price: result.newPrice,
          change_percent: result.changePercent, reason: result.reason,
          source: result.source, metadata: { ...result.metadata, engine_version: "legacy_rollback" },
        });
        updated++;
      } catch (e) {
        errors.push(`${asset.slug}: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }
  }

  await supabase.rpc("decay_trade_volumes");

  let ranksRecorded = 0;
  let eventsGenerated = 0;
  let notificationsCreated = 0;
  let rankMovements = new Map<string, AssetRankMovement>();
  let recentMarketEvents: MarketEvent[] = [];
  let driftWarning: string | undefined;
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

  const dailyMoves = (assets as Asset[])
    .map((asset) => {
      const anchor = price24hAgo.get(asset.id);
      if (!anchor || anchor <= 0) return null;
      return ((Number(asset.current_price) - anchor) / anchor) * 100;
    })
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b);
  if (dailyMoves.length > 0) {
    const middle = Math.floor(dailyMoves.length / 2);
    const medianDailyDrift =
      dailyMoves.length % 2 === 0
        ? (dailyMoves[middle - 1] + dailyMoves[middle]) / 2
        : dailyMoves[middle];
    if (Math.abs(medianDailyDrift) > MARKET_DRIFT_WARNING_PERCENT_PER_DAY) {
      driftWarning = `Market-wide median 24h drift ${medianDailyDrift.toFixed(3)}% exceeds ±${MARKET_DRIFT_WARNING_PERCENT_PER_DAY}%`;
      errors.push(`market_drift_warning: ${driftWarning}`);
    }
  }

  if (useV2 && engineRunId) {
    const { data: driftValue, error: driftError } = await supabase.rpc(
      "get_market_engine_v2_seven_day_drift"
    );
    const sevenDayDrift = Number(driftValue ?? 0);
    if (driftError) errors.push(`seven_day_drift: ${driftError.message}`);
    if (Math.abs(sevenDayDrift) > MARKET_DRIFT_WARNING_PERCENT_PER_DAY) {
      driftWarning = `Market Engine v2 seven-day unconditional drift ${sevenDayDrift.toFixed(3)}% per day exceeds ±${MARKET_DRIFT_WARNING_PERCENT_PER_DAY}%`;
      errors.push(`market_drift_warning: ${driftWarning}`);
    }
    const { error: finishError } = await supabase.rpc("finish_market_engine_v2_run", {
      p_run_id: engineRunId,
      p_asset_count: assets.length,
      p_updated_count: updated,
      p_skipped_count: skipped,
      p_error_count: errors.length,
      p_drift: sevenDayDrift,
      p_warning: driftWarning ?? null,
    });
    if (finishError) errors.push(`finish_v2_run: ${finishError.message}`);
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
    engine: useV2 ? "v2" : "legacy_rollback",
    runId: engineRunId,
    updated,
    skipped,
    ranksRecorded,
    eventsGenerated,
    notificationsCreated,
    total: assets.length,
    errors: errors.length > 0 ? errors : undefined,
    driftWarning,
    timestamp: now.toISOString(),
  });
}
