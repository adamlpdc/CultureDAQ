import type { AchievementId } from "@/lib/achievements";
import { ACHIEVEMENT_BY_ID } from "@/lib/achievements";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const BADGE_STYLES: Partial<Record<AchievementId, string>> = {
  hot_streak: "border-gold-muted bg-gold-subtle text-gold",
  momentum_hunter: "border-primary-muted bg-primary-light text-primary",
  top_trader: "border-gold-muted bg-gold-subtle text-gold",
  early_adopter: "border-primary-muted bg-primary-light text-primary",
  diamond_hands: "border-border-tint bg-surface-muted text-foreground-secondary",
  first_trade: "border-border-tint bg-surface-muted text-foreground-secondary",
  portfolio_builder: "border-primary-muted bg-primary-light text-primary",
};

export function AchievementBadgePill({
  achievementId,
  className,
  showLabel = true,
}: {
  achievementId: AchievementId;
  className?: string;
  showLabel?: boolean;
}) {
  const def = ACHIEVEMENT_BY_ID[achievementId];
  if (!def) return null;

  return (
    <Badge
      className={cn(
        "gap-0.5 px-1.5 py-0 text-[9px] font-semibold",
        BADGE_STYLES[achievementId] ?? "border-border bg-surface-muted text-muted",
        className
      )}
    >
      <span aria-hidden>{def.emoji}</span>
      {showLabel ? def.label : null}
    </Badge>
  );
}

export function AchievementBadgeGroup({
  achievementIds,
  className,
}: {
  achievementIds: AchievementId[];
  className?: string;
}) {
  if (achievementIds.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-0.5", className)}>
      {achievementIds.map((id) => (
        <AchievementBadgePill key={id} achievementId={id} />
      ))}
    </div>
  );
}
