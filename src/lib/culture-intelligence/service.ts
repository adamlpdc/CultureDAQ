import { createAdminClient } from "@/lib/supabase/admin";
import { generateMockCultureEvents } from "@/lib/culture-intelligence/mock-events";
import type {
  CultureEvent,
  CultureEventFilters,
  CultureEventRow,
} from "@/lib/culture-intelligence/types";
import { isCultureIntelligenceV1Enabled } from "@/lib/env";

export interface CultureEventRepository {
  list(filters?: CultureEventFilters): Promise<CultureEvent[]>;
}

function applyFilters(events: CultureEvent[], filters?: CultureEventFilters): CultureEvent[] {
  return events.filter(
    (event) =>
      (!filters?.status || event.status === filters.status) &&
      (!filters?.eventType || event.eventType === filters.eventType)
  );
}

export class MockCultureEventRepository implements CultureEventRepository {
  async list(filters?: CultureEventFilters): Promise<CultureEvent[]> {
    return applyFilters(generateMockCultureEvents(), filters);
  }
}

function fromRow(row: CultureEventRow): CultureEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sourceName: row.source,
    sourceUrl: row.source_url,
    eventType: row.event_type,
    affectedAssets: row.affected_assets,
    confidence: Number(row.confidence),
    expectedAttention: Number(row.expected_attention),
    predictedAttention: Number(row.predicted_attention),
    sentiment: row.sentiment,
    reach: Number(row.reach),
    timeToPeakHours: Number(row.time_to_peak_hours),
    decayRate: Number(row.decay_rate),
    status: row.status,
    actualAttention: row.actual_attention == null ? null : Number(row.actual_attention),
    surpriseDelta: row.surprise_delta == null ? null : Number(row.surprise_delta),
    momentumScore: row.momentum_score == null ? null : Number(row.momentum_score),
    viralMultiplier: row.viral_multiplier == null ? null : Number(row.viral_multiplier),
    resolvedAt: row.resolved_at,
    isVerified: Boolean(row.is_verified),
    createdBy: row.created_by,
    source: "supabase",
    createdAt: row.created_at,
  };
}

export class SupabaseCultureEventRepository implements CultureEventRepository {
  async list(filters?: CultureEventFilters): Promise<CultureEvent[]> {
    const supabase = createAdminClient();
    let query = supabase.from("culture_events").select("*").order("created_at", { ascending: false });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.eventType) query = query.eq("event_type", filters.eventType);

    const { data, error } = await query;
    if (error) throw new Error(`Unable to load CultureEvents: ${error.message}`);
    return ((data ?? []) as CultureEventRow[]).map(fromRow);
  }
}

export class CultureEventService {
  constructor(private readonly repository: CultureEventRepository) {}

  list(filters?: CultureEventFilters): Promise<CultureEvent[]> {
    return this.repository.list(filters);
  }
}

export function createCultureEventService(): CultureEventService {
  const repository =
    isCultureIntelligenceV1Enabled() || process.env.CULTURE_EVENTS_SOURCE === "supabase"
      ? new SupabaseCultureEventRepository()
      : new MockCultureEventRepository();
  return new CultureEventService(repository);
}
