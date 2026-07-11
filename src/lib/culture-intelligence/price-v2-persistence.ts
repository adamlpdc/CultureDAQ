import { createAdminClient } from "@/lib/supabase/admin";
import type { MarketSimulation } from "@/lib/culture-intelligence/price-v2";

/** Writes only to the sandbox market_simulations table. */
export async function persistMarketSimulation(simulation: MarketSimulation) {
  if (process.env.FEATURE_CULTURE_INTELLIGENCE !== "true") {
    throw new Error("Culture Intelligence feature is disabled");
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("market_simulations")
    .insert({
      asset_slug: simulation.assetSlug,
      asset_name: simulation.assetName,
      old_price: simulation.oldPrice,
      simulated_price: simulation.simulatedPrice,
      change_percent: simulation.changePercent,
      price_impact: simulation.priceImpact,
      culture_event_id: simulation.cultureEventId,
      culture_event_title: simulation.cultureEventTitle,
      reason: simulation.reason,
      short_explanation: simulation.shortExplanation,
      detailed_explanation: simulation.detailedExplanation,
      explanation_trace: simulation.explanationTrace,
      impact_lanes: simulation.lanes,
      simulated_at: simulation.simulatedAt,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { ...simulation, id: data.id as string };
}
