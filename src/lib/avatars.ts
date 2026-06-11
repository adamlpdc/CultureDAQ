export type AvatarStyleId = string;

export interface AvatarPreset {
  id: AvatarStyleId;
  label: string;
  emoji: string;
  /** Accent hue for avatar ring / background gradient */
  hue: number;
}

/** CultureDAQ Avatar System V1 — player identity avatars */
export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "classic", label: "Classic", emoji: "😀", hue: 42 },
  { id: "trendsetter", label: "Trendsetter", emoji: "😎", hue: 210 },
  { id: "momentum-hunter", label: "Momentum Hunter", emoji: "🚀", hue: 265 },
  { id: "movie-buff", label: "Movie Buff", emoji: "🎬", hue: 340 },
  { id: "sports-fan", label: "Sports Fan", emoji: "⚽", hue: 145 },
  { id: "music-lover", label: "Music Lover", emoji: "🎵", hue: 280 },
  { id: "champion", label: "Champion", emoji: "👑", hue: 45 },
  { id: "hot-streak", label: "Hot Streak", emoji: "🔥", hue: 18 },
  { id: "diamond-hands", label: "Diamond Hands", emoji: "💎", hue: 195 },
];

const LEGACY_AVATAR_MAP: Record<string, AvatarStyleId> = {
  default: "classic",
  "hue-30": "hot-streak",
  "hue-200": "momentum-hunter",
  "hue-140": "sports-fan",
  "hue-270": "music-lover",
  "hue-350": "movie-buff",
  "hue-180": "diamond-hands",
  "emoji-trophy": "champion",
  "emoji-fire": "hot-streak",
  "emoji-diamond": "diamond-hands",
  "emoji-crown": "champion",
  "emoji-target": "trendsetter",
};

const presetById = new Map(AVATAR_PRESETS.map((p) => [p.id, p]));

export function normalizeAvatarStyle(id: string | null | undefined): AvatarStyleId {
  if (!id) return "classic";
  if (presetById.has(id)) return id;
  return LEGACY_AVATAR_MAP[id] ?? "classic";
}

export function getAvatarPreset(id: string | null | undefined): AvatarPreset {
  return presetById.get(normalizeAvatarStyle(id)) ?? AVATAR_PRESETS[0];
}

export function resolveAvatarEmoji(avatarStyle?: string | null): string {
  return getAvatarPreset(avatarStyle).emoji;
}

export function resolveAvatarHue(avatarStyle?: string | null): number {
  return getAvatarPreset(avatarStyle).hue;
}

/** @deprecated Use resolveAvatarHue with avatar preset */
export function resolveAvatarHueFromUsername(_username: string, avatarStyle?: string | null): number {
  return resolveAvatarHue(avatarStyle);
}
