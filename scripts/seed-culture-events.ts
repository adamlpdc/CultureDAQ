import { createClient } from "@supabase/supabase-js";
import { generateMockCultureEvents } from "../src/lib/culture-intelligence/mock-events";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const rows = generateMockCultureEvents().map((event) => ({
  id: event.id,
  title: event.title,
  event_type: event.eventType,
  affected_assets: event.affectedAssets,
  confidence: event.confidence,
  expected_attention: event.expectedAttention,
  predicted_attention: event.predictedAttention,
  sentiment: event.sentiment,
  reach: event.reach,
  time_to_peak_hours: event.timeToPeakHours,
  decay_rate: event.decayRate,
  status: event.status,
  actual_attention: event.actualAttention,
  surprise_delta: event.surpriseDelta,
  momentum_score: event.momentumScore,
  viral_multiplier: event.viralMultiplier,
  resolved_at: event.resolvedAt,
  created_at: event.createdAt,
}));

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error } = await supabase.from("culture_events").upsert(rows, { onConflict: "id" });
if (error) throw error;

console.log(`Seeded ${rows.length} sandbox CultureEvents.`);
