import type { AssetCategory } from "@/types/database";

export const STARTING_DAQ = 100_000;

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  actors: "Actors",
  musicians: "Musicians",
  athletes: "Athletes",
  influencers: "Influencers",
  tv_personalities: "TV Personalities",
  brands: "Brands",
  movies: "Movies",
  tv_shows: "TV Shows",
  sports_teams: "Sports Teams",
};

export const ALL_CATEGORIES: AssetCategory[] = [
  "actors",
  "musicians",
  "athletes",
  "influencers",
  "tv_personalities",
  "brands",
  "movies",
  "tv_shows",
  "sports_teams",
];

export const CATEGORY_COLORS: Record<AssetCategory, string> = {
  actors: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  musicians: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  athletes: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  influencers: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  tv_personalities: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  brands: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  movies: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  tv_shows: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  sports_teams: "bg-lime-500/20 text-lime-300 border-lime-500/30",
};

export const MIN_ASSET_PRICE = 1.0;
export const MAX_PRICE_CHANGE_PERCENT = 15;
export const PRICE_UPDATE_INTERVAL_MINUTES = 15;
