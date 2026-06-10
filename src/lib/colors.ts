/**
 * CultureDAQ design tokens — single source of truth.
 * Every value maps to Tailwind via globals.css @theme.
 */
export const colors = {
  /* Backgrounds — warm neutrals */
  background: "#F4F2EE",
  backgroundWarm: "#EDEAE4",
  section: "#FAFAF8",
  surface: "#FFFFFF",
  surfaceMuted: "#F7F5F2",
  surfaceHover: "#F0EDE8",
  surfaceInset: "#EBE8E3",

  /* Borders — subtle tint */
  border: "#E4E0D8",
  borderLight: "#D6D1C7",
  borderTint: "#D4D0F0",

  /* Text — rich charcoal */
  foreground: "#1C1917",
  foregroundSecondary: "#44403C",
  muted: "#78716C",
  mutedLight: "#A8A29E",

  /* Primary — indigo / royal blue */
  primary: "#3730A3",
  primaryHover: "#312E81",
  primaryLight: "#EEF2FF",
  primaryMuted: "#C7D2FE",
  primarySubtle: "#F5F3FF",

  /* Secondary — deep navy */
  secondary: "#1E1B4B",
  secondaryHover: "#151233",
  secondaryLight: "#E8E7F5",

  /* Market signals */
  gain: "#15803D",
  gainHover: "#166534",
  gainLight: "#ECFDF3",
  gainMuted: "#BBF7D0",
  gainSubtle: "#F0FDF4",

  loss: "#B91C1C",
  lossHover: "#991B1B",
  lossLight: "#FEF2F2",
  lossMuted: "#FECACA",
  lossSubtle: "#FFF1F2",

  gold: "#B45309",
  goldHover: "#92400E",
  goldLight: "#FFFBEB",
  goldMuted: "#FDE68A",
  goldSubtle: "#FEF9C3",

  /* Charts */
  chart: "#3730A3",
  chartGradient: "#6366F1",

  /* Category badge tints */
  catActorsBg: "#F5F3FF",
  catActorsText: "#5B21B6",
  catActorsBorder: "#DDD6FE",
  catMusiciansBg: "#FDF2F8",
  catMusiciansText: "#9D174D",
  catMusiciansBorder: "#FBCFE8",
  catAthletesBg: "#ECFDF5",
  catAthletesText: "#047857",
  catAthletesBorder: "#A7F3D0",
  catInfluencersBg: "#FFF7ED",
  catInfluencersText: "#C2410C",
  catInfluencersBorder: "#FED7AA",
  catTvBg: "#FFFBEB",
  catTvText: "#B45309",
  catTvBorder: "#FDE68A",
  catBrandsBg: "#EFF6FF",
  catBrandsText: "#1D4ED8",
  catBrandsBorder: "#BFDBFE",
  catMoviesBg: "#FFF1F2",
  catMoviesText: "#BE123C",
  catMoviesBorder: "#FECDD3",
  catTvShowsBg: "#ECFEFF",
  catTvShowsText: "#0E7490",
  catTvShowsBorder: "#A5F3FC",
  catSportsBg: "#F7FEE7",
  catSportsText: "#4D7C0F",
  catSportsBorder: "#D9F99D",
} as const;

export const shadows = {
  card: "0 1px 2px rgb(28 25 23 / 0.04), 0 4px 12px rgb(28 25 23 / 0.06)",
  cardHover: "0 4px 8px rgb(28 25 23 / 0.06), 0 12px 28px rgb(28 25 23 / 0.08)",
  nav: "0 1px 3px rgb(28 25 23 / 0.05), 0 8px 24px rgb(28 25 23 / 0.04)",
  elevated: "0 8px 30px rgb(28 25 23 / 0.08)",
} as const;

export const radius = {
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.25rem",
  card: "1rem",
  button: "0.75rem",
} as const;

export const spacing = {
  section: "3rem",
  sectionLg: "4rem",
} as const;

export type ThemeColor = keyof typeof colors;
