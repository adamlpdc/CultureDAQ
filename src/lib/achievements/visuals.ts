import type { AchievementCategory, AchievementRarity } from "@/types/database";

export interface RarityVisual {
  label: AchievementRarity;
  badge: string;
  border: string;
  text: string;
  glow?: string;
}

export interface CategoryVisual {
  label: AchievementCategory;
  accent: string;
  badge: string;
  bar: string;
  iconRing: string;
}

export const RARITY_VISUALS: Record<AchievementRarity, RarityVisual> = {
  Common: {
    label: "Common",
    badge: "border-border bg-surface-muted text-muted",
    border: "border-border/80",
    text: "text-muted",
  },
  Rare: {
    label: "Rare",
    badge: "border-primary-muted bg-primary-light text-primary",
    border: "border-primary-muted/60",
    text: "text-primary",
  },
  Epic: {
    label: "Epic",
    badge: "border-[#C4B5FD] bg-[#F5F3FF] text-[#6D28D9]",
    border: "border-[#DDD6FE]",
    text: "text-[#6D28D9]",
  },
  Legendary: {
    label: "Legendary",
    badge: "border-gold-muted bg-gold-subtle text-gold",
    border: "border-gold-muted",
    text: "text-gold",
    glow: "shadow-[0_0_24px_-4px_rgba(180,83,9,0.25)]",
  },
};

export const CATEGORY_VISUALS: Record<AchievementCategory, CategoryVisual> = {
  "Getting Started": {
    label: "Getting Started",
    accent: "text-primary",
    badge: "bg-primary-light text-primary border-primary-muted",
    bar: "bg-primary",
    iconRing: "ring-primary-muted/50",
  },
  Trading: {
    label: "Trading",
    accent: "text-gold",
    badge: "bg-gold-light text-gold border-gold-muted",
    bar: "bg-gold",
    iconRing: "ring-gold-muted/50",
  },
  Portfolio: {
    label: "Portfolio",
    accent: "text-gain",
    badge: "bg-gain-light text-gain border-gain-muted",
    bar: "bg-gain",
    iconRing: "ring-gain-muted/50",
  },
  Discovery: {
    label: "Discovery",
    accent: "text-[#7C3AED]",
    badge: "bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]",
    bar: "bg-[#7C3AED]",
    iconRing: "ring-[#DDD6FE]",
  },
  Rankings: {
    label: "Rankings",
    accent: "text-gold-hover",
    badge: "bg-gold-subtle text-gold-hover border-gold-muted",
    bar: "bg-gold-hover",
    iconRing: "ring-gold-muted/60",
  },
  Categories: {
    label: "Categories",
    accent: "text-[#0D9488]",
    badge: "bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]",
    bar: "bg-[#0D9488]",
    iconRing: "ring-[#99F6E4]",
  },
  Streaks: {
    label: "Streaks",
    accent: "text-loss",
    badge: "bg-loss-light text-loss border-loss-muted",
    bar: "bg-loss",
    iconRing: "ring-loss-muted/50",
  },
  Special: {
    label: "Special",
    accent: "text-secondary",
    badge: "bg-secondary-light text-secondary border-border-tint",
    bar: "bg-secondary",
    iconRing: "ring-border-tint",
  },
};

export function getRarityVisual(rarity: AchievementRarity): RarityVisual {
  return RARITY_VISUALS[rarity] ?? RARITY_VISUALS.Common;
}

export function getCategoryVisual(category: AchievementCategory): CategoryVisual {
  return CATEGORY_VISUALS[category] ?? CATEGORY_VISUALS.Special;
}
