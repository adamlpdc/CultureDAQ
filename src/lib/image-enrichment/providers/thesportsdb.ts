import { titleSimilarity } from "../normalize";
import type { ImageCandidate } from "../types";

interface SportsDbTeam {
  idTeam: string;
  strTeam: string;
  strBadge: string | null;
  strLeague?: string;
}

const API_BASE = "https://www.thesportsdb.com/api/v1/json/3";

async function searchTeams(query: string): Promise<SportsDbTeam[]> {
  const url = `${API_BASE}/searchteams.php?t=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const data = (await res.json()) as { teams: SportsDbTeam[] | null };
  return data.teams ?? [];
}

function scoreTeam(assetName: string, team: SportsDbTeam): number {
  let score = titleSimilarity(assetName, team.strTeam);
  if (!team.strBadge) score *= 0.5;
  return Math.round(score * 1000) / 1000;
}

export async function matchSportsTeam(
  assetName: string,
  searchQuery?: string
): Promise<ImageCandidate[]> {
  const query = searchQuery ?? assetName;
  const teams = await searchTeams(query);
  if (!teams.length) return [];

  const candidates: ImageCandidate[] = [];
  for (const t of teams.slice(0, 5)) {
    if (!t.strBadge) continue;
    candidates.push({
      title: t.strTeam,
      imageUrl: t.strBadge,
      confidence: scoreTeam(assetName, t),
      source: "thesportsdb",
      externalId: t.idTeam,
      note: t.strLeague,
    });
  }
  return candidates.sort((a, b) => b.confidence - a.confidence);
}
