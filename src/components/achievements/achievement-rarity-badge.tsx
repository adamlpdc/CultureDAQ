import type { AchievementRarity } from "@/types/database";
import { getRarityVisual } from "@/lib/achievements/visuals";
import { cn } from "@/lib/utils";

export function AchievementRarityBadge({
  rarity,
  className,
}: {
  rarity: AchievementRarity;
  className?: string;
}) {
  const visual = getRarityVisual(rarity);
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
        visual.badge,
        className
      )}
    >
      {visual.label}
    </span>
  );
}
