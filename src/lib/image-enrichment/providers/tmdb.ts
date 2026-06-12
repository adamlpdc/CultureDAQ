import { extractYear, normalizeTitle, titleSimilarity } from "../normalize";
import type { ImageCandidate } from "../types";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

interface TmdbSearchMovie {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
  popularity?: number;
}

interface TmdbSearchTv {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path: string | null;
  popularity?: number;
}

function posterUrl(path: string | null): string | null {
  return path ? `${TMDB_IMAGE_BASE}${path}` : null;
}

async function tmdbFetch<T>(apiKey: string, path: string): Promise<T | null> {
  const url = `https://api.themoviedb.org/3${path}${path.includes("?") ? "&" : "?"}api_key=${apiKey}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

function scoreMovieResult(
  assetName: string,
  result: TmdbSearchMovie,
  hintYear: number | null
): number {
  let score = titleSimilarity(assetName, result.title);
  const releaseYear = result.release_date
    ? parseInt(result.release_date.slice(0, 4), 10)
    : null;
  if (hintYear && releaseYear === hintYear) score = Math.min(1, score + 0.06);
  if (!result.poster_path) score *= 0.5;
  return Math.round(score * 1000) / 1000;
}

function scoreTvResult(
  assetName: string,
  result: TmdbSearchTv,
  hintYear: number | null
): number {
  let score = titleSimilarity(assetName, result.name);
  const airYear = result.first_air_date
    ? parseInt(result.first_air_date.slice(0, 4), 10)
    : null;
  if (hintYear && airYear === hintYear) score = Math.min(1, score + 0.06);
  if (!result.poster_path) score *= 0.5;
  return Math.round(score * 1000) / 1000;
}

export async function searchTmdbMovies(
  apiKey: string,
  query: string,
  assetName: string
): Promise<ImageCandidate[]> {
  const hintYear = extractYear(assetName);
  const data = await tmdbFetch<{ results: TmdbSearchMovie[] }>(
    apiKey,
    `/search/movie?query=${encodeURIComponent(query)}`
  );
  if (!data?.results?.length) return [];

  const candidates: ImageCandidate[] = [];
  for (const r of data.results.slice(0, 5)) {
    const url = posterUrl(r.poster_path);
    if (!url) continue;
    candidates.push({
      title: r.title,
      imageUrl: url,
      confidence: scoreMovieResult(assetName, r, hintYear),
      source: "tmdb",
      externalId: String(r.id),
    });
  }
  return candidates.sort((a, b) => b.confidence - a.confidence);
}

export async function searchTmdbTv(
  apiKey: string,
  query: string,
  assetName: string
): Promise<ImageCandidate[]> {
  const hintYear = extractYear(assetName);
  const data = await tmdbFetch<{ results: TmdbSearchTv[] }>(
    apiKey,
    `/search/tv?query=${encodeURIComponent(query)}`
  );
  if (!data?.results?.length) return [];

  const candidates: ImageCandidate[] = [];
  for (const r of data.results.slice(0, 5)) {
    const url = posterUrl(r.poster_path);
    if (!url) continue;
    candidates.push({
      title: r.name,
      imageUrl: url,
      confidence: scoreTvResult(assetName, r, hintYear),
      source: "tmdb",
      externalId: String(r.id),
    });
  }
  return candidates.sort((a, b) => b.confidence - a.confidence);
}

export async function fetchTmdbCollectionPoster(
  apiKey: string,
  collectionId: string,
  label: string
): Promise<ImageCandidate | null> {
  const data = await tmdbFetch<{ name: string; poster_path: string | null }>(
    apiKey,
    `/collection/${collectionId}`
  );
  const url = posterUrl(data?.poster_path ?? null);
  if (!url) return null;
  return {
    title: label || data?.name || `Collection ${collectionId}`,
    imageUrl: url,
    confidence: 1,
    source: "tmdb",
    externalId: collectionId,
    note: "collection",
  };
}

export async function fetchTmdbMoviePoster(
  apiKey: string,
  movieId: string,
  label: string
): Promise<ImageCandidate | null> {
  const data = await tmdbFetch<{ title: string; poster_path: string | null }>(
    apiKey,
    `/movie/${movieId}`
  );
  const url = posterUrl(data?.poster_path ?? null);
  if (!url) return null;
  return {
    title: label || data?.title || `Movie ${movieId}`,
    imageUrl: url,
    confidence: 1,
    source: "tmdb",
    externalId: movieId,
  };
}

export async function fetchTmdbTvPoster(
  apiKey: string,
  tvId: string,
  label: string
): Promise<ImageCandidate | null> {
  const data = await tmdbFetch<{ name: string; poster_path: string | null }>(
    apiKey,
    `/tv/${tvId}`
  );
  const url = posterUrl(data?.poster_path ?? null);
  if (!url) return null;
  return {
    title: label || data?.name || `TV ${tvId}`,
    imageUrl: url,
    confidence: 1,
    source: "tmdb",
    externalId: tvId,
  };
}

export function tmdbSearchQuery(name: string): string {
  return normalizeTitle(name).replace(/\bii\b/g, "2").replace(/\biii\b/g, "3");
}
