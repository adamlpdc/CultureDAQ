import { normalizeTitle, titleSimilarity } from "../normalize";
import type { PortraitCandidate } from "../portrait-types";

const TMDB_PROFILE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 CultureDAQ/1.0";

interface TmdbPersonSearchResult {
  id: number;
  name: string;
  profile_path: string | null;
  popularity?: number;
}

function profileUrl(path: string | null): string | null {
  return path ? `${TMDB_PROFILE_BASE}${path.startsWith("/") ? path : `/${path}`}` : null;
}

async function tmdbFetch<T>(apiKey: string, path: string): Promise<T | null> {
  const url = `https://api.themoviedb.org/3${path}${path.includes("?") ? "&" : "?"}api_key=${apiKey}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

function scorePerson(assetName: string, person: { name: string; profile_path: string | null }): number {
  let score = titleSimilarity(assetName, person.name);
  if (!person.profile_path) score *= 0.5;
  return Math.round(score * 1000) / 1000;
}

async function scrapePersonProfileUrl(personId: string): Promise<{ name: string; imageUrl: string } | null> {
  const res = await fetch(`https://www.themoviedb.org/person/${personId}`, {
    headers: { "User-Agent": TMDB_UA },
  });
  if (!res.ok) return null;

  const html = await res.text();
  const imageMatch = html.match(/https:\/\/image\.tmdb\.org\/t\/p\/w500\/[A-Za-z0-9]+\.jpg/);
  if (!imageMatch) return null;

  const nameMatch = html.match(/<title>([^<|]+)/);
  const name = nameMatch?.[1]?.trim() ?? `Person ${personId}`;

  return { name, imageUrl: imageMatch[0] };
}

async function scrapePersonSearch(assetName: string): Promise<PortraitCandidate[]> {
  const query = encodeURIComponent(normalizeTitle(assetName));
  const res = await fetch(`https://www.themoviedb.org/search/person?query=${query}`, {
    headers: { "User-Agent": TMDB_UA },
  });
  if (!res.ok) return [];

  const html = await res.text();
  const linkPattern = /href="\/person\/(\d+)-[^"]+"/g;
  const ids: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(html)) !== null) {
    if (!ids.includes(match[1])) ids.push(match[1]);
    if (ids.length >= 3) break;
  }

  const candidates: PortraitCandidate[] = [];
  for (const id of ids.slice(0, 2)) {
    const profile = await scrapePersonProfileUrl(id);
    if (!profile) continue;
    candidates.push({
      title: profile.name,
      imageUrl: profile.imageUrl,
      confidence: scorePerson(assetName, { name: profile.name, profile_path: "/" }),
      source: "tmdb",
      externalId: id,
      note: "scraped",
    });
    await new Promise((r) => setTimeout(r, 150));
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

export async function searchTmdbPerson(
  apiKey: string | null,
  assetName: string
): Promise<PortraitCandidate[]> {
  if (apiKey) {
    const data = await tmdbFetch<{ results: TmdbPersonSearchResult[] }>(
      apiKey,
      `/search/person?query=${encodeURIComponent(assetName)}`
    );
    if (data?.results?.length) {
      const candidates: PortraitCandidate[] = [];
      for (const person of data.results.slice(0, 5)) {
        const imageUrl = profileUrl(person.profile_path);
        if (!imageUrl) continue;
        candidates.push({
          title: person.name,
          imageUrl,
          confidence: scorePerson(assetName, person),
          source: "tmdb",
          externalId: String(person.id),
        });
      }
      if (candidates.length) {
        return candidates.sort((a, b) => b.confidence - a.confidence);
      }
    }
  }

  return scrapePersonSearch(assetName);
}
