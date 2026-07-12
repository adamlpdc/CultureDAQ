import { NextRequest, NextResponse } from "next/server";
import { createDiscoveryService } from "@/lib/culture-intelligence/discovery-service";
import { isCultureIntelligenceV2Enabled } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isCultureIntelligenceV2Enabled()) return NextResponse.json({ message: "AI discovery disabled", suggestionsCreated: 0 });
  const interval = Math.max(5, Number(process.env.AI_DISCOVERY_INTERVAL_MINUTES ?? 15));
  const intervalMs = interval * 60 * 1000;
  const tickKey = new Date(Math.floor(Date.now() / intervalMs) * intervalMs).toISOString();
  try {
    return NextResponse.json(await createDiscoveryService().run(tickKey));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Discovery failed" }, { status: 500 });
  }
}
