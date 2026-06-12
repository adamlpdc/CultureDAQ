import { titleSimilarity } from "../normalize";
import type { PortraitCandidate } from "../portrait-types";

interface SportsDbPlayer {
  idPlayer: string;
  strPlayer: string;
  strThumb: string | null;
  strCutout: string | null;
  strSport?: string;
  strTeam?: string;
}

const API_BASE = "https://www.thesportsdb.com/api/v1/json/3";

async function searchPlayers(query: string): Promise<SportsDbPlayer[]> {
  const url = `${API_BASE}/searchplayers.php?p=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const data = (await res.json()) as { player: SportsDbPlayer[] | null };
  return data.player ?? [];
}

function scorePlayer(assetName: string, player: SportsDbPlayer): number {
  let score = titleSimilarity(assetName, player.strPlayer);
  if (!player.strCutout && !player.strThumb) score *= 0.5;
  return Math.round(score * 1000) / 1000;
}

export async function searchSportsDbPlayer(assetName: string): Promise<PortraitCandidate[]> {
  const players = await searchPlayers(assetName);
  if (!players.length) return [];

  const candidates: PortraitCandidate[] = [];
  for (const player of players.slice(0, 5)) {
    const imageUrl = player.strCutout || player.strThumb;
    if (!imageUrl) continue;
    candidates.push({
      title: player.strPlayer,
      imageUrl,
      confidence: scorePlayer(assetName, player),
      source: "thesportsdb",
      externalId: player.idPlayer,
      note: [player.strSport, player.strTeam].filter(Boolean).join(" · "),
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}
