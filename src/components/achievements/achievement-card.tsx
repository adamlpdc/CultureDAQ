import type { AchievementHighlight } from "@/lib/achievements";
import { ACHIEVEMENT_BY_ID } from "@/lib/achievements";
import { Card } from "@/components/ui/card";
import { cn, displayUsername } from "@/lib/utils";

interface AchievementCardProps {
  highlight: AchievementHighlight;
  className?: string;
}

export function AchievementCard({ highlight, className }: AchievementCardProps) {
  const linked = highlight.achievementId
    ? ACHIEVEMENT_BY_ID[highlight.achievementId]
    : null;

  return (
    <Card
      className={cn(
        "relative overflow-hidden !p-4 transition-shadow hover:shadow-card-hover",
        className
      )}
    >
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gold-subtle/40 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <span className="text-2xl" aria-hidden>
            {highlight.emoji}
          </span>
          {linked && (
            <span className="rounded-full border border-gold-muted bg-gold-subtle px-2 py-0.5 text-[9px] font-bold text-gold">
              +{linked.points} pts
            </span>
          )}
        </div>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted">
          {highlight.label}
        </p>
        <p className="mt-1.5 truncate text-sm font-bold text-foreground">
          {displayUsername(highlight.username)}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
          {highlight.detail}
        </p>
        {linked && (
          <p className="mt-2 text-[10px] font-medium text-foreground-secondary">
            {linked.emoji} {linked.label}
          </p>
        )}
      </div>
    </Card>
  );
}
