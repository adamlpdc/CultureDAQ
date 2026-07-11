import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildExpectationHistory,
  calculateAssetExpectations,
  DEFAULT_EXPECTATION_CONFIG,
  type ExpectationConfig,
} from "@/lib/culture-intelligence/expectation";
import type { CultureEvent } from "@/lib/culture-intelligence/types";

export async function persistExpectationSnapshot(
  events: CultureEvent[],
  now = new Date(),
  config: ExpectationConfig = DEFAULT_EXPECTATION_CONFIG
) {
  const supabase = createAdminClient();
  const expectations = calculateAssetExpectations(events, now, config);
  const history = buildExpectationHistory(events, now, config).filter(
    (point) => point.recordedAt === now.toISOString()
  );

  const { error: expectationError } = await supabase.from("asset_expectations").upsert(
    expectations.map((item) => ({
      asset_slug: item.assetSlug,
      asset_name: item.assetName,
      expectation_score: item.currentExpectation,
      previous_score: item.previousExpectation,
      decay_half_life_hours: item.decayTimerHours,
      contributing_event_ids: item.contributions.map((event) => event.eventId),
      calculated_at: item.calculatedAt,
    })),
    { onConflict: "asset_slug" }
  );
  if (expectationError) throw expectationError;

  const { error: historyError } = await supabase.from("asset_expectation_history").insert(
    history.map((point) => ({
      asset_slug: point.assetSlug,
      expectation_score: point.score,
      reason: point.reason,
      culture_event_id: point.cultureEventId ?? null,
      recorded_at: point.recordedAt,
    }))
  );
  if (historyError) throw historyError;

  return expectations;
}
