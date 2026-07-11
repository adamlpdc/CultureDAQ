import { resolveCultureEvent } from "@/lib/culture-intelligence/attention";
import type { CultureEvent } from "@/lib/culture-intelligence/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolves and persists one sandbox CultureEvent. This deliberately updates
 * culture_events only; it has no access to production asset or price tables.
 */
export async function resolveAndPersistCultureEvent(
  event: CultureEvent,
  actualAttention: number,
  resolvedAt = new Date()
) {
  if (process.env.FEATURE_CULTURE_INTELLIGENCE !== "true") {
    throw new Error("Culture Intelligence feature is disabled");
  }

  const resolution = resolveCultureEvent(event, actualAttention, resolvedAt);
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("culture_events")
    .update({
      actual_attention: resolution.actualAttention,
      surprise_delta: resolution.surpriseDelta,
      momentum_score: resolution.momentumScore,
      viral_multiplier: resolution.viralMultiplier,
      resolved_at: resolution.resolvedAt,
      status: "peaked",
    })
    .eq("id", event.id);

  if (error) throw error;
  return resolution;
}
