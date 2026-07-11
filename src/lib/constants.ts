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
  actors: "bg-cat-actors-bg text-cat-actors-text border-cat-actors-border",
  musicians: "bg-cat-musicians-bg text-cat-musicians-text border-cat-musicians-border",
  athletes: "bg-cat-athletes-bg text-cat-athletes-text border-cat-athletes-border",
  influencers: "bg-cat-influencers-bg text-cat-influencers-text border-cat-influencers-border",
  tv_personalities: "bg-cat-tv-bg text-cat-tv-text border-cat-tv-border",
  brands: "bg-cat-brands-bg text-cat-brands-text border-cat-brands-border",
  movies: "bg-cat-movies-bg text-cat-movies-text border-cat-movies-border",
  tv_shows: "bg-cat-tvshows-bg text-cat-tvshows-text border-cat-tvshows-border",
  sports_teams: "bg-cat-sports-bg text-cat-sports-text border-cat-sports-border",
};

export const MIN_ASSET_PRICE = 1.0;
/** Normal, non-event movement limit for each 15-minute production tick. */
export const MAX_PRICE_CHANGE_PERCENT = 0.35;
export const VERIFIED_EVENT_MAX_PRICE_CHANGE_PERCENT = 15;
export const MAX_ROLLING_24H_CHANGE_PERCENT = 5;
export const PRICE_MATERIALITY_PERCENT = 0.02;
export const MARKET_DRIFT_WARNING_PERCENT_PER_DAY = 0.15;
export const PRICE_UPDATE_INTERVAL_MINUTES = 15;

export const CULTURE_MOMENTS = [
  {
    title: "Summer Blockbusters",
    emoji: "🎬",
    description: "Box office season is driving film and franchise momentum.",
    icon: "film" as const,
    assetSlugs: ["dune", "deadpool-wolverine", "wicked"],
  },
  {
    title: "Club World Cup",
    emoji: "⚽",
    description: "Global football fixtures lifting teams and athlete attention.",
    icon: "sports" as const,
    assetSlugs: ["real-madrid", "manchester-city", "fc-barcelona"],
  },
  {
    title: "Festival Season",
    emoji: "🎵",
    description: "Touring cycles and festival buzz boosting artist volume.",
    icon: "music" as const,
    assetSlugs: ["sabrina-carpenter", "drake", "billie-eilish"],
  },
  {
    title: "Fashion Week",
    emoji: "👗",
    description: "Runway moments pushing brands and personalities into focus.",
    icon: "fashion" as const,
    assetSlugs: ["nike", "zendaya", "apple"],
  },
] as const;
