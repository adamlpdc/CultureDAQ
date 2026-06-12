import { readFileSync } from "fs";
import { resolve } from "path";
import { normalizeTitle } from "./normalize";
import { matchClearbitBrand } from "./providers/clearbit";
import {
  fetchTmdbCollectionPoster,
  fetchTmdbMoviePoster,
  fetchTmdbTvPoster,
  searchTmdbMovies,
  searchTmdbTv,
  tmdbSearchQuery,
} from "./providers/tmdb";
import { matchSportsTeam } from "./providers/thesportsdb";
import { pickBestCandidate } from "./review";
import {
  ENRICHABLE_CATEGORIES,
  type DryRunReport,
  type EnrichableCategory,
  type EnrichmentInput,
  type EnrichmentResult,
  type ImageCandidate,
  type ImageSource,
} from "./types";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

type OverrideEntry =
  | {
      provider: "tmdb_collection" | "tmdb_movie" | "tmdb_tv";
      external_id: string;
      label?: string;
      year?: number;
      poster_path?: string;
      /** Optional static poster URL for dry-run when TMDB_API_KEY is unavailable */
      image_url?: string;
    }
  | { provider: "clearbit"; domain: string; image_url?: string }
  | { provider: "thesportsdb"; search: string; image_url?: string };

function loadOverrides(): Record<string, OverrideEntry> {
  const path = resolve(process.cwd(), "data/asset-image-overrides.json");
  return JSON.parse(readFileSync(path, "utf-8")) as Record<string, OverrideEntry>;
}

async function resolveOverride(
  slug: string,
  asset: EnrichmentInput,
  overrides: Record<string, OverrideEntry>,
  tmdbKey: string | null
): Promise<ImageCandidate | null> {
  const entry = overrides[slug];
  if (!entry) return null;

  if (entry.provider === "clearbit") {
    if (entry.image_url) {
      return {
        title: asset.name,
        imageUrl: entry.image_url,
        confidence: 1,
        source: "clearbit",
        externalId: entry.domain,
        note: "curated override",
      };
    }
    return {
      title: asset.name,
      imageUrl: `https://logo.clearbit.com/${entry.domain}`,
      confidence: 1,
      source: "clearbit",
      externalId: entry.domain,
      note: "curated override (unverified)",
    };
  }

  if (entry.provider === "thesportsdb") {
    if (entry.image_url) {
      return {
        title: asset.name,
        imageUrl: entry.image_url,
        confidence: 1,
        source: "thesportsdb",
        externalId: entry.search,
        note: "curated override",
      };
    }
    const candidates = await matchSportsTeam(asset.name, entry.search);
    return candidates[0] ?? null;
  }

  const staticUrl =
    entry.image_url ??
    (entry.poster_path ? `${TMDB_IMAGE_BASE}${entry.poster_path}` : null);
  if (staticUrl) {
    return {
      title: entry.label ?? asset.name,
      imageUrl: staticUrl,
      confidence: 1,
      source: "tmdb",
      externalId: entry.external_id,
      note: "curated override",
    };
  }

  if (!tmdbKey) return null;

  if (entry.provider === "tmdb_collection") {
    return fetchTmdbCollectionPoster(tmdbKey, entry.external_id, entry.label ?? asset.name);
  }
  if (entry.provider === "tmdb_movie") {
    return fetchTmdbMoviePoster(tmdbKey, entry.external_id, entry.label ?? asset.name);
  }
  if (entry.provider === "tmdb_tv") {
    return fetchTmdbTvPoster(tmdbKey, entry.external_id, entry.label ?? asset.name);
  }

  return null;
}

async function enrichMovieOrTv(
  asset: EnrichmentInput,
  tmdbKey: string | null
): Promise<ImageCandidate[]> {
  if (!tmdbKey) return [];
  const query = tmdbSearchQuery(asset.name);
  if (asset.category === "movies") {
    return searchTmdbMovies(tmdbKey, query, asset.name);
  }
  return searchTmdbTv(tmdbKey, query, asset.name);
}

async function enrichBrand(asset: EnrichmentInput): Promise<ImageCandidate[]> {
  const guesses = [
    `${normalizeTitle(asset.name).replace(/\s+/g, "")}.com`,
    `${asset.slug}.com`,
  ];
  if (asset.slug === "prime-hydration") guesses.unshift("drinkprime.com");

  const seen = new Set<string>();
  for (const domain of guesses) {
    if (seen.has(domain)) continue;
    seen.add(domain);
    const verified = await matchClearbitBrand(domain, asset.name);
    if (verified) return [verified];
  }

  const fallbackDomain = guesses[0];
  if (!fallbackDomain) return [];

  return [
    {
      title: asset.name,
      imageUrl: `https://logo.clearbit.com/${fallbackDomain}`,
      confidence: 0.78,
      source: "clearbit",
      externalId: fallbackDomain,
      note: "unverified domain guess",
    },
  ];
}

async function enrichSportsTeam(asset: EnrichmentInput): Promise<ImageCandidate[]> {
  return matchSportsTeam(asset.name);
}

export async function enrichAsset(
  asset: EnrichmentInput,
  options: {
    tmdbApiKey: string | null;
    overrides: Record<string, OverrideEntry>;
  }
): Promise<EnrichmentResult> {
  const override = await resolveOverride(asset.slug, asset, options.overrides, options.tmdbApiKey);

  let candidates: ImageCandidate[] = [];
  let source: ImageSource | null = null;

  if (override) {
    candidates = [{ ...override, source: override.source, note: override.note ?? "curated override" }];
    source = "override";
  } else if (asset.category === "movies" || asset.category === "tv_shows") {
    candidates = await enrichMovieOrTv(asset, options.tmdbApiKey);
    source = candidates[0]?.source ?? null;
  } else if (asset.category === "brands") {
    candidates = await enrichBrand(asset);
    source = candidates[0]?.source ?? null;
  } else if (asset.category === "sports_teams") {
    candidates = await enrichSportsTeam(asset);
    source = candidates[0]?.source ?? null;
  }

  const { best, manualReview, reviewReason } = pickBestCandidate(candidates);

  if (override && override.confidence === 1) {
    return {
      assetId: asset.id,
      slug: asset.slug,
      name: asset.name,
      category: asset.category,
      proposedImageUrl: override.imageUrl,
      source: "override",
      confidence: 1,
      manualReview: false,
      reviewReason: null,
      matchLabel: override.title,
      candidates,
    };
  }

  return {
    assetId: asset.id,
    slug: asset.slug,
    name: asset.name,
    category: asset.category,
    proposedImageUrl: best?.imageUrl ?? null,
    source: best ? (source ?? best.source) : null,
    confidence: best?.confidence ?? null,
    manualReview,
    reviewReason,
    matchLabel: best?.title ?? null,
    candidates,
  };
}

export async function runDryRunEnrichment(
  assets: EnrichmentInput[],
  tmdbApiKey: string | null
): Promise<DryRunReport> {
  const overrides = loadOverrides();
  const filtered = assets.filter((a) =>
    ENRICHABLE_CATEGORIES.includes(a.category as EnrichableCategory)
  );

  const results: EnrichmentResult[] = [];
  for (const asset of filtered) {
    results.push(await enrichAsset(asset, { tmdbApiKey, overrides }));
    await new Promise((r) => setTimeout(r, 250));
  }

  const byCategory = Object.fromEntries(
    ENRICHABLE_CATEGORIES.map((c) => [c, { total: 0, matched: 0, manualReview: 0 }])
  ) as DryRunReport["summary"]["byCategory"];

  for (const r of results) {
    const bucket = byCategory[r.category];
    bucket.total++;
    if (r.proposedImageUrl) bucket.matched++;
    if (r.manualReview) bucket.manualReview++;
  }

  return {
    generatedAt: new Date().toISOString(),
    dryRun: true,
    providers: {
      tmdb: Boolean(tmdbApiKey),
      clearbit: true,
      thesportsdb: true,
    },
    summary: {
      total: results.length,
      matched: results.filter((r) => r.proposedImageUrl).length,
      manualReview: results.filter((r) => r.manualReview).length,
      unmatched: results.filter((r) => !r.proposedImageUrl).length,
      byCategory,
    },
    results,
  };
}
