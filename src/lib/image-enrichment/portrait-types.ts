import type { AssetCategory } from "@/types/database";

export const PORTRAIT_CATEGORIES = [
  "actors",
  "athletes",
  "musicians",
  "tv_personalities",
] as const satisfies readonly AssetCategory[];

export type PortraitCategory = (typeof PORTRAIT_CATEGORIES)[number];

export type PortraitImageSource = "tmdb" | "thesportsdb" | "wikipedia" | "override";

export interface PortraitCandidate {
  title: string;
  imageUrl: string;
  confidence: number;
  source: PortraitImageSource;
  externalId?: string;
  note?: string;
}

export interface PortraitEnrichmentInput {
  id: string;
  slug: string;
  name: string;
  category: PortraitCategory;
}

export interface PortraitEnrichmentResult {
  assetId: string;
  slug: string;
  name: string;
  category: PortraitCategory;
  proposedImageUrl: string | null;
  source: PortraitImageSource | null;
  confidence: number | null;
  manualReview: boolean;
  reviewReason: string | null;
  matchLabel: string | null;
  verified: boolean;
  httpStatus: number | null;
  candidates: PortraitCandidate[];
}

export interface PortraitDryRunReport {
  generatedAt: string;
  dryRun: true;
  providers: {
    tmdb: boolean;
    thesportsdb: boolean;
    wikipedia: boolean;
  };
  summary: {
    total: number;
    verified: number;
    manualReview: number;
    unverified: number;
    byCategory: Record<
      PortraitCategory,
      { total: number; verified: number; manualReview: number }
    >;
  };
  results: PortraitEnrichmentResult[];
}
