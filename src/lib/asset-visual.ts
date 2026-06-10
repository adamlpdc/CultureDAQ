import type { AssetCategory } from "@/types/database";

export const PERSON_CATEGORIES: AssetCategory[] = [
  "actors",
  "musicians",
  "athletes",
  "influencers",
  "tv_personalities",
];

export const POSTER_CATEGORIES: AssetCategory[] = ["movies", "tv_shows"];

export function isPersonCategory(category: AssetCategory): boolean {
  return PERSON_CATEGORIES.includes(category);
}

export function usesImageUrl(category: AssetCategory): boolean {
  return !isPersonCategory(category);
}

/** Derive 1–3 letter initials from an asset name. */
export function getAssetInitials(name: string): string {
  const cleaned = name.replace(/[&']/g, " ").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  if (words.length === 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Stable hue from name for avatar backgrounds. */
export function getAvatarHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export const SHOWCASE_SLUGS = [
  "nike",
  "taylor-swift",
  "manchester-city",
  "dune",
  "apple",
] as const;
