import type { CategoryCollectionStat } from "@/lib/queries";
import { getCategoryVisual } from "@/lib/achievements/visuals";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AchievementsCollectionBarProps {
  collections: CategoryCollectionStat[];
}

export function AchievementsCollectionBar({ collections }: AchievementsCollectionBarProps) {
  if (collections.length === 0) return null;

  return (
    <Card className="!p-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-muted">
        Collections
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {collections.map(({ category, unlocked, total }) => {
          const visual = getCategoryVisual(category);
          const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
          return (
            <div
              key={category}
              className="rounded-xl border border-border/70 bg-surface-muted/30 px-2.5 py-2"
            >
              <p className={cn("truncate text-[10px] font-bold", visual.accent)} title={category}>
                {category === "Getting Started" ? "Started" : category.split(" ")[0]}
              </p>
              <p className="text-stat mt-0.5 text-xs font-bold text-foreground">
                {unlocked} / {total}
              </p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={cn("h-full rounded-full transition-all", visual.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
