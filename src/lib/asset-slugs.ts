/** Legacy asset URL slugs → canonical slugs (Asset Naming V1, Jun 2026). */
export const LEGACY_ASSET_SLUG_REDIRECTS: Record<string, string> = {
  prime: "prime-hydration",
  avatar: "avatar-film-franchise",
  fallout: "fallout-tv-series",
  barbie: "barbie-2023",
  shogun: "shogun-2024",
  "ferrari-f1": "scuderia-ferrari",
};

export function resolveAssetSlug(slug: string): string {
  return LEGACY_ASSET_SLUG_REDIRECTS[slug] ?? slug;
}

export function isLegacyAssetSlug(slug: string): boolean {
  return slug in LEGACY_ASSET_SLUG_REDIRECTS;
}
