import { NextResponse } from "next/server";
import { isCultureIntelligenceEnabled } from "@/lib/env";
import { createCultureEventService } from "@/lib/culture-intelligence/service";
import {
  runReplayLab,
  type ReplayBalanceConfig,
  type ReplayRun,
} from "@/lib/culture-intelligence/replay-lab";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAssets, getCurrentUser, getProfile } from "@/lib/queries";

async function requireAdmin() {
  if (!isCultureIntelligenceEnabled()) return { error: "Not found", status: 404 } as const;
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized", status: 401 } as const;
  const profile = await getProfile(user.id);
  if (!profile?.is_admin) return { error: "Forbidden", status: 403 } as const;
  return { user } as const;
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (process.env.CULTURE_EVENTS_SOURCE !== "supabase") {
    return NextResponse.json({ runs: [] });
  }
  const { data, error } = await createAdminClient()
    .from("replay_lab_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const runs: ReplayRun[] = (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    config: row.balance_config as ReplayRun["config"],
    statistics: row.statistics as ReplayRun["statistics"],
    simulations: row.simulation_results as ReplayRun["simulations"],
    createdAt: row.created_at as string,
  }));
  return NextResponse.json({ runs });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await request.json()) as { name?: string; config?: ReplayBalanceConfig };
  if (!body.config) return NextResponse.json({ error: "config is required" }, { status: 400 });

  try {
    const [events, assets] = await Promise.all([
      createCultureEventService().list(),
      getAssets({ sort: "name" }),
    ]);
    let run = runReplayLab({
      events,
      assets: assets.map((asset) => ({
        slug: asset.slug,
        name: asset.name,
        livePrice: asset.current_price,
      })),
      config: body.config,
      name: body.name,
    });

    let persisted = false;
    if (process.env.CULTURE_EVENTS_SOURCE === "supabase") {
      const { data, error } = await createAdminClient()
        .from("replay_lab_runs")
        .insert({
          name: run.name,
          balance_config: run.config,
          statistics: run.statistics,
          simulation_results: run.simulations,
          created_by: auth.user.id,
          created_at: run.createdAt,
        })
        .select("id")
        .single();
      if (error) throw error;
      run = { ...run, id: data.id as string };
      persisted = true;
    }
    return NextResponse.json({ run, persisted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Replay failed" },
      { status: 400 }
    );
  }
}
