import type { AchievementHighlight } from "@/lib/achievements";
import { AchievementCard } from "@/components/achievements/achievement-card";

interface AchievementsHighlightsProps {
  highlights: AchievementHighlight[];
}

export function AchievementsHighlights({ highlights }: AchievementsHighlightsProps) {
  if (highlights.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-surface-muted/20 px-4 py-6 text-center">
        <p className="text-sm font-semibold text-foreground">No highlights yet</p>
        <p className="mt-1 text-xs text-muted">
          Trade, climb the board, and unlock the first achievements.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      {highlights.map((highlight) => (
        <AchievementCard key={highlight.id} highlight={highlight} />
      ))}
    </div>
  );
}
