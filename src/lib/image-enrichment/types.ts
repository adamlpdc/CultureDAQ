import type { AssetCategory } from "@/types/database";

export const ENRICHABLE_CATEGORIES = [
  "movies",
  "tv_shows",
  "brands",
  "sports_teams",
] as const satisfies readonly AssetCategory[];

export type EnrichableCategory = (typeof ENRICHABLE_CATEGORIES)[number];

export type ImageSource =
  | "tmdb"
  | "clearbit"
  | "thesportsdb"
  | "override";

export interface ImageCandidate {
  title: string;
  imageUrl: string;
  confidence: number;
  source: ImageSource;
  externalId?: string;
  note?: string;
}

export interface EnrichmentInput {
  id: string;
  slug: string;
  name: string;
  category: EnrichableCategory;
}

export interface EnrichmentResult {
  assetId: string;
  slug: string;
  name: string;
  category: EnrichableCategory;
  proposedImageUrl: string | null;
  source: ImageSource | null;
  confidence: number | null;
  manualReview: boolean;
  reviewReason: string | null;
  matchLabel: string | null;
  candidates: ImageCandidate[];
}

export interface DryRunReport {
  generatedAt: string;
  dryRun: true;
  providers: {
    tmdb: boolean;
    clearbit: boolean;
    thesportsdb: boolean;
  };
  summary: {
    total: number;
    matched: number;
    manualReview: number;
    unmatched: number;
    byCategory: Record<
      EnrichableCategory,
      { total: number; matched: number; manualReview: number }
    >;
  };
  results: EnrichmentResult[];
}

export interface ImageCoverageStats {
  total: number;
  withImage: number;
  withoutImage: number;
  coveragePercent: number;
  byCategory: Record<
    EnrichableCategory,
    { total: number; withImage: number; withoutImage: number }
  >;
}

export interface AppliedAssetUpdate {
  assetId: string;
  slug: string;
  name: string;
  category: EnrichableCategory;
  previousImageUrl: string | null;
  newImageUrl: string;
  source: ImageSource;
  confidence: number;
  matchLabel: string | null;
}

export interface ApplyReport {
  generatedAt: string;
  dryRun: false;
  before: ImageCoverageStats;
  after: ImageCoverageStats;
  summary: {
    enriched: number;
    skippedManualReview: number;
    skippedUnmatched: number;
    skippedUnverified: number;
    skippedUnchanged: number;
    errors: number;
  };
  updated: AppliedAssetUpdate[];
  manualReview: EnrichmentResult[];
  errors: { assetId: string; slug: string; name: string; error: string }[];
}
