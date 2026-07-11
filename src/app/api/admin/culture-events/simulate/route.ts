import { NextResponse } from "next/server";
import { isCultureIntelligenceEnabled } from "@/lib/env";
import { calculateAssetExpectations, getExpectationConfigFromEnv } from "@/lib/culture-intelligence/expectation";
import { createCultureEventService } from "@/lib/culture-intelligence/service";
import { getPriceV2ConfigFromEnv, simulatePriceV2 } from "@/lib/culture-intelligence/price-v2";
import { persistMarketSimulation } from "@/lib/culture-intelligence/price-v2-persistence";
import { getAssets, getCurrentUser, getProfile } from "@/lib/queries";

export async function POST(request: Request) {
  if (!isCultureIntelligenceEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getProfile(user.id);
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    eventId?: string;
    assetSlug?: string;
    replayAt?: string;
  };
  if (!body.eventId || !body.assetSlug) {
    return NextResponse.json({ error: "eventId and assetSlug are required" }, { status: 400 });
  }

  const replayAt = body.replayAt ? new Date(body.replayAt) : new Date();
  if (Number.isNaN(replayAt.getTime())) {
    return NextResponse.json({ error: "Invalid replayAt timestamp" }, { status: 400 });
  }

  const events = await createCultureEventService().list();
  const event = events.find((item) => item.id === body.eventId);
  if (!event) return NextResponse.json({ error: "CultureEvent not found" }, { status: 404 });
  if (
    event.actualAttention == null ||
    event.surpriseDelta == null ||
    event.momentumScore == null ||
    event.viralMultiplier == null
  ) {
    return NextResponse.json({ error: "CultureEvent is not resolved" }, { status: 409 });
  }
  if (!event.affectedAssets.some((asset) => asset.slug === body.assetSlug)) {
    return NextResponse.json({ error: "Asset is not affected by this event" }, { status: 400 });
  }

  const assets = await getAssets({ sort: "name" });
  const asset = assets.find((item) => item.slug === body.assetSlug);
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  const expectation = calculateAssetExpectations(
    events,
    replayAt,
    getExpectationConfigFromEnv()
  ).find((item) => item.assetSlug === asset.slug);

  const simulation = simulatePriceV2(
    {
      assetSlug: asset.slug,
      assetName: asset.name,
      cultureEventId: event.id,
      cultureEventTitle: event.title,
      oldPrice: asset.current_price,
      expectationScore: expectation?.currentExpectation ?? 0,
      expectedAttention: event.expectedAttention,
      actualAttention: event.actualAttention,
      surpriseDelta: event.surpriseDelta,
      momentumScore: event.momentumScore,
      viralMultiplier: event.viralMultiplier,
      simulatedAt: replayAt.toISOString(),
    },
    getPriceV2ConfigFromEnv()
  );

  // Mock mode replays without database writes. Supabase mode persists only to
  // market_simulations after its sandbox migration has been applied.
  const persisted = process.env.CULTURE_EVENTS_SOURCE === "supabase";
  const result = persisted ? await persistMarketSimulation(simulation) : simulation;
  return NextResponse.json({ simulation: result, persisted });
}
