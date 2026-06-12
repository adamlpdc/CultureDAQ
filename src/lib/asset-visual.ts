import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Clapperboard,
  Drama,
  Mic2,
  Smartphone,
  Trophy,
  Tv,
} from "lucide-react";
import type { AssetCategory } from "@/types/database";

export const PERSON_CATEGORIES: AssetCategory[] = [
  "actors",
  "musicians",
  "athletes",
  "influencers",
  "tv_personalities",
];

export const POSTER_CATEGORIES: AssetCategory[] = ["movies", "tv_shows"];

export const LOGO_CATEGORIES: AssetCategory[] = ["brands", "sports_teams"];

/** Emoji shown inside category pills sitewide. */
export const CATEGORY_EMOJI: Record<AssetCategory, string> = {
  actors: "🎭",
  musicians: "🎵",
  athletes: "🏆",
  influencers: "📱",
  tv_personalities: "📺",
  brands: "🏢",
  movies: "🎬",
  tv_shows: "📺",
  sports_teams: "🏟️",
};

/** Lucide icons for category navigation tiles (Browse by Category). */
export const CATEGORY_ICONS: Record<AssetCategory, LucideIcon> = {
  actors: Drama,
  musicians: Mic2,
  athletes: Trophy,
  influencers: Smartphone,
  tv_personalities: Tv,
  brands: Building2,
  movies: Clapperboard,
  tv_shows: Tv,
  sports_teams: Trophy,
};

export function isPersonCategory(category: AssetCategory): boolean {
  return PERSON_CATEGORIES.includes(category);
}

export function isLogoCategory(category: AssetCategory): boolean {
  return LOGO_CATEGORIES.includes(category);
}

export function isPosterCategory(category: AssetCategory): boolean {
  return POSTER_CATEGORIES.includes(category);
}

/** All categories may use image_url; fallbacks apply when null. */
export function usesImageUrl(): boolean {
  return true;
}

export type AssetIdentityRenderMode =
  | "poster-image"
  | "logo-image"
  | "portrait-image"
  | "portrait-fallback"
  | "poster-fallback"
  | "logo-fallback"
  | "category-fallback";

/** Branch selection for AssetIdentity — used by the component and verification scripts. */
export function resolveAssetIdentityRenderMode(
  category: AssetCategory,
  imageUrl?: string | null
): AssetIdentityRenderMode {
  const hasImage = Boolean(imageUrl);
  if (hasImage && isPosterCategory(category)) return "poster-image";
  if (hasImage && isLogoCategory(category)) return "logo-image";
  if (hasImage && isPersonCategory(category)) return "portrait-image";
  if (isPersonCategory(category)) return "portrait-fallback";
  if (isPosterCategory(category)) return "poster-fallback";
  if (isLogoCategory(category)) return "logo-fallback";
  return "category-fallback";
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

export type IdentitySize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";

export const IDENTITY_SIZE_CLASSES: Record<
  IdentitySize,
  {
    box: string;
    text: string;
    img: number;
    poster?: string;
  }
> = {
  xs: {
    box: "h-8 w-8 rounded-lg",
    text: "text-[10px]",
    img: 32,
  },
  sm: {
    box: "h-10 w-10 rounded-xl",
    text: "text-xs",
    img: 40,
  },
  md: {
    box: "h-12 w-12 rounded-xl",
    text: "text-sm",
    img: 48,
  },
  lg: {
    box: "h-14 w-14 rounded-2xl",
    text: "text-base",
    img: 56,
  },
  xl: {
    box: "h-20 w-20 rounded-2xl",
    text: "text-lg",
    img: 80,
  },
  hero: {
    box: "h-24 w-24 rounded-2xl sm:h-28 sm:w-28",
    text: "text-xl sm:text-2xl",
    img: 112,
    poster: "h-32 w-24 rounded-xl sm:h-36 sm:w-28",
  },
};
