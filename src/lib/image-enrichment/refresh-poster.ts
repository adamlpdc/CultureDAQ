import {
  fetchTmdbCollectionPoster,
  fetchTmdbMoviePoster,
  fetchTmdbTvPoster,
} from "./providers/tmdb";
import { verifyImageUrl } from "./verify";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 CultureDAQ/1.0";

type TmdbOverride =
  | {
      provider: "tmdb_collection" | "tmdb_movie" | "tmdb_tv";
      external_id: string;
      poster_path?: string;
      label?: string;
    };

function posterFromPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.startsWith("/t/p/")) {
    return `https://image.tmdb.org${normalized}`;
  }
  return `${TMDB_IMAGE_BASE}${normalized}`;
}

async function scrapeTmdbPosterPath(
  provider: TmdbOverride["provider"],
  externalId: string
): Promise<string | null> {
  const segment =
    provider === "tmdb_collection"
      ? `collection/${externalId}`
      : provider === "tmdb_movie"
        ? `movie/${externalId}`
        : `tv/${externalId}`;

  const res = await fetch(`https://www.themoviedb.org/${segment}`, {
    headers: { "User-Agent": TMDB_UA },
  });
  if (!res.ok) return null;

  const html = await res.text();
  const pathMatch = html.match(/\/t\/p\/w500\/([A-Za-z0-9]+\.jpg)/);
  return pathMatch ? `/${pathMatch[1]}` : null;
}

export async function resolveVerifiedTmdbPoster(
  entry: TmdbOverride,
  tmdbApiKey: string | null
): Promise<{ imageUrl: string; posterPath: string } | null> {
  if (tmdbApiKey) {
    const candidate =
      entry.provider === "tmdb_collection"
        ? await fetchTmdbCollectionPoster(
            tmdbApiKey,
            entry.external_id,
            entry.label ?? ""
          )
        : entry.provider === "tmdb_movie"
          ? await fetchTmdbMoviePoster(tmdbApiKey, entry.external_id, entry.label ?? "")
          : await fetchTmdbTvPoster(tmdbApiKey, entry.external_id, entry.label ?? "");

    if (candidate?.imageUrl) {
      const verified = await verifyImageUrl(candidate.imageUrl);
      if (verified.ok) {
        const path = candidate.imageUrl.replace(TMDB_IMAGE_BASE, "");
        return { imageUrl: candidate.imageUrl, posterPath: path.startsWith("/") ? path : `/${path}` };
      }
    }
  }

  const scrapedPath = await scrapeTmdbPosterPath(entry.provider, entry.external_id);
  if (scrapedPath) {
    const imageUrl = posterFromPath(scrapedPath);
    const verified = await verifyImageUrl(imageUrl);
    if (verified.ok) {
      return { imageUrl, posterPath: scrapedPath };
    }
  }

  if (entry.poster_path) {
    const imageUrl = posterFromPath(entry.poster_path);
    const verified = await verifyImageUrl(imageUrl);
    if (verified.ok) {
      return { imageUrl, posterPath: entry.poster_path };
    }
  }

  return null;
}
