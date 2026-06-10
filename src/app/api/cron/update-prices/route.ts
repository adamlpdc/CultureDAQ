import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  calculateNewPrice,
  calculateMomentumUpdate,
  decayPressure,
} from "@/lib/price-engine";
import type { Asset } from "@/types/database";

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

  const { data: profiles } = await supabase.from("profiles").select("*");

  if (profiles) {
    for (const profile of profiles) {
      const { data: holdings } = await supabase
        .from("holdings")
        .select("shares, asset:assets(current_price)")
        .eq("user_id", profile.user_id);

      const holdingsValue = (holdings ?? []).reduce((sum, h) => {
        const a = h.asset as unknown as { current_price: number } | null;
        return sum + h.shares * (a?.current_price ?? 0);
      }, 0);

      const totalValue = profile.daq_balance + holdingsValue;

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

        const holdingsValue = (holdings ?? []).reduce((sum, h) => {
          const a = h.asset as unknown as { current_price: number } | null;
          return sum + h.shares * (a?.current_price ?? 0);
        }, 0);

        return {
          user_id: profile.user_id,
          username: profile.username,
          total_value: profile.daq_balance + holdingsValue,
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
      await supabase.from("leaderboard_snapshots").insert(ranked);
    }
  }

  return NextResponse.json({
    message: "Price update complete",
    updated,
    total: assets.length,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: now.toISOString(),
  });
}
