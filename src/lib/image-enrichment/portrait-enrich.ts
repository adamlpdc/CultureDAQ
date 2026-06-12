import { searchTmdbPerson } from "./providers/tmdb-person";
import { searchSportsDbPlayer } from "./providers/thesportsdb-player";
import { searchWikipediaPortrait } from "./providers/wikipedia";
import {
  PORTRAIT_CATEGORIES,
  type PortraitCandidate,
  type PortraitCategory,
  type PortraitDryRunReport,
  type PortraitEnrichmentInput,
  type PortraitEnrichmentResult,
} from "./portrait-types";
import { verifyImageUrl } from "./verify";

const CONFIDENCE_THRESHOLD = 0.85;
const AMBIGUITY_GAP = 0.08;

function pickBestPortrait(candidates: PortraitCandidate[]): {
  best: PortraitCandidate | null;
  manualReview: boolean;
  reviewReason: string | null;
} {
  if (candidates.length === 0) {
    return { best: null, manualReview: true, reviewReason: "no_match" };
  }

  const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence);
  const best = sorted[0];
  const second = sorted[1];

  if (best.confidence < CONFIDENCE_THRESHOLD) {
    return {
      best,
      manualReview: true,
      reviewReason: `low_confidence (${best.confidence})`,
    };
  }

  if (
    second &&
    best.confidence - second.confidence < AMBIGUITY_GAP &&
    best.confidence < 0.98
  ) {
    return {
      best,
      manualReview: true,
      reviewReason: `ambiguous (${best.title} vs ${second.title})`,
    };
  }

  return { best, manualReview: false, reviewReason: null };
}

async function gatherCandidates(
  asset: PortraitEnrichmentInput,
  tmdbApiKey: string | null
): Promise<PortraitCandidate[]> {
  if (asset.category === "athletes") {
    return searchSportsDbPlayer(asset.name);
  }

  const tmdb = await searchTmdbPerson(tmdbApiKey, asset.name);
  if (tmdb.length > 0 && asset.category !== "musicians") {
    return tmdb;
  }

  if (asset.category === "musicians") {
    const wiki = await searchWikipediaPortrait(asset.name);
    const merged = [...tmdb, ...wiki].sort((a, b) => b.confidence - a.confidence);
    return merged;
  }

  return tmdb;
}

async function pickVerifiedCandidate(
  candidates: PortraitCandidate[]
): Promise<{ candidate: PortraitCandidate | null; httpStatus: number | null }> {
  const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence);
  for (const candidate of sorted) {
    const verified = await verifyImageUrl(candidate.imageUrl);
    if (verified.ok) {
      return { candidate, httpStatus: verified.status };
    }
  }
  return { candidate: null, httpStatus: null };
}

export async function enrichPortraitAsset(
  asset: PortraitEnrichmentInput,
  tmdbApiKey: string | null
): Promise<PortraitEnrichmentResult> {
  const candidates = await gatherCandidates(asset, tmdbApiKey);
  const { best, manualReview, reviewReason } = pickBestPortrait(candidates);
  const { candidate: verified, httpStatus } = await pickVerifiedCandidate(candidates);

  const needsReview = manualReview || !verified;
  const reason = !verified
    ? candidates.length
      ? "no_verified_url"
      : (reviewReason ?? "no_match")
    : reviewReason;

  return {
    assetId: asset.id,
    slug: asset.slug,
    name: asset.name,
    category: asset.category,
    proposedImageUrl: verified?.imageUrl ?? null,
    source: verified?.source ?? null,
    confidence: verified?.confidence ?? best?.confidence ?? null,
    manualReview: needsReview,
    reviewReason: needsReview ? reason : null,
    matchLabel: verified?.title ?? best?.title ?? null,
    verified: Boolean(verified),
    httpStatus,
    candidates,
  };
}

export async function runPortraitDryRun(
  assets: PortraitEnrichmentInput[],
  tmdbApiKey: string | null
): Promise<PortraitDryRunReport> {
  const filtered = assets.filter((a) =>
    PORTRAIT_CATEGORIES.includes(a.category as PortraitCategory)
  );

  const results: PortraitEnrichmentResult[] = [];
  for (const asset of filtered) {
    results.push(await enrichPortraitAsset(asset, tmdbApiKey));
    await new Promise((r) => setTimeout(r, 300));
  }

  const byCategory = Object.fromEntries(
    PORTRAIT_CATEGORIES.map((c) => [c, { total: 0, verified: 0, manualReview: 0 }])
  ) as PortraitDryRunReport["summary"]["byCategory"];

  for (const r of results) {
    const bucket = byCategory[r.category];
    bucket.total++;
    if (r.verified) bucket.verified++;
    if (r.manualReview) bucket.manualReview++;
  }

  return {
    generatedAt: new Date().toISOString(),
    dryRun: true,
    providers: {
      tmdb: true,
      thesportsdb: true,
      wikipedia: true,
    },
    summary: {
      total: results.length,
      verified: results.filter((r) => r.verified).length,
      manualReview: results.filter((r) => r.manualReview).length,
      unverified: results.filter((r) => !r.verified).length,
      byCategory,
    },
    results,
  };
}
