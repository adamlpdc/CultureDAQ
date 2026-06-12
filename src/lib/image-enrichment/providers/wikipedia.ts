import { titleSimilarity } from "../normalize";
import type { PortraitCandidate } from "../portrait-types";

function wikiTitleFromName(name: string): string {
  return name.trim().replace(/\s+/g, "_");
}

export async function searchWikipediaPortrait(assetName: string): Promise<PortraitCandidate[]> {
  const title = wikiTitleFromName(assetName);
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "CultureDAQ-portrait-enrichment/1.0",
    },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    title?: string;
    thumbnail?: { source?: string };
  };

  const imageUrl = data.thumbnail?.source;
  if (!imageUrl) return [];

  const pageTitle = data.title ?? assetName;
  return [
    {
      title: pageTitle,
      imageUrl,
      confidence: titleSimilarity(assetName, pageTitle),
      source: "wikipedia",
      externalId: title,
      note: "wikipedia thumbnail",
    },
  ];
}
