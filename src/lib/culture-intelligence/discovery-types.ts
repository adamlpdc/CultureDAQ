import type { CultureEventAsset, CultureEventSentiment, CultureEventType } from "./types";

export const SUGGESTION_STATUSES = ["pending", "approved", "rejected", "merged"] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export interface DiscoveryArticle {
  sourceId: string;
  sourceName: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
}

export interface SuggestedCultureEvent {
  id: string;
  title: string;
  summary: string;
  eventType: CultureEventType;
  affectedAssets: CultureEventAsset[];
  confidence: number;
  sentiment: CultureEventSentiment;
  expectedAttention: number;
  predictedAttention: number;
  reach: number;
  timeToPeakHours: number;
  decayRate: number;
  reasoning: string;
  sourceLinks: Array<{ title: string; url: string; sourceName: string }>;
  status: SuggestionStatus;
  duplicateKey: string;
  estimatedPriceImpactPercent: number;
  mergedIntoId: string | null;
  approvedCultureEventId: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export type DiscoveryCandidate = Omit<SuggestedCultureEvent,
  "id" | "status" | "duplicateKey" | "estimatedPriceImpactPercent" |
  "mergedIntoId" | "approvedCultureEventId" | "createdAt" | "reviewedAt">;

export interface DiscoveryMonitoring {
  suggestionsToday: number;
  approvalRate: number;
  rejectionRate: number;
  averageConfidence: number;
  averagePredictionAccuracy: number | null;
  duplicateDetectionRate: number;
}
