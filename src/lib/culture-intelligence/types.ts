export const CULTURE_EVENT_TYPES = [
  "announcement",
  "release",
  "performance",
  "award",
  "controversy",
  "viral_moment",
  "sports_result",
  "partnership",
] as const;

export const CULTURE_EVENT_STATUSES = [
  "draft", "verified", "resolved", "cancelled",
] as const;

export type CultureEventType = (typeof CULTURE_EVENT_TYPES)[number];
export type CultureEventStatus = (typeof CULTURE_EVENT_STATUSES)[number];
export type CultureEventSentiment = "positive" | "neutral" | "negative" | "mixed";

export interface CultureEventAsset {
  assetId?: string;
  slug: string;
  name: string;
}

/**
 * Stable input contract for Culture Intelligence consumers.
 * The future Expectation Engine should depend on this type, not storage rows.
 */
export interface CultureEvent {
  id: string;
  title: string;
  description: string;
  sourceName: string;
  sourceUrl: string | null;
  eventType: CultureEventType;
  affectedAssets: CultureEventAsset[];
  confidence: number;
  expectedAttention: number;
  predictedAttention: number;
  sentiment: CultureEventSentiment;
  reach: number;
  timeToPeakHours: number;
  decayRate: number;
  status: CultureEventStatus;
  actualAttention: number | null;
  surpriseDelta: number | null;
  momentumScore: number | null;
  viralMultiplier: number | null;
  resolvedAt: string | null;
  isVerified: boolean;
  createdBy: string | null;
  source: "mock" | "supabase";
  createdAt: string;
}

export interface CultureEventRow {
  id: string;
  title: string;
  description: string;
  source: string;
  source_url: string | null;
  event_type: CultureEventType;
  affected_assets: CultureEventAsset[];
  confidence: number;
  expected_attention: number;
  predicted_attention: number;
  sentiment: CultureEventSentiment;
  reach: number;
  time_to_peak_hours: number;
  decay_rate: number;
  status: CultureEventStatus;
  actual_attention: number | null;
  surprise_delta: number | null;
  momentum_score: number | null;
  viral_multiplier: number | null;
  resolved_at: string | null;
  is_verified?: boolean;
  created_by: string | null;
  created_at: string;
}

export interface CultureEventFilters {
  status?: CultureEventStatus;
  eventType?: CultureEventType;
}
