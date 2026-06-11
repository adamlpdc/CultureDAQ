import { cn } from "@/lib/utils";
import type { AssetRankMovement } from "@/types/database";
import { formatRankMovementLabel } from "@/lib/rank-significance";

const pillBase =
  "inline-flex items-center rounded-full border font-semibold tabular-nums leading-none";

interface RankPillProps {
  rank: number;
  className?: string;
  /** "short" = #22, "label" = Rank #22 */
  variant?: "short" | "label";
}

/** Subtle market-rank pill for overview cards */
export function RankPill({ rank, className, variant = "short" }: RankPillProps) {
  return (
    <span
      className={cn(
        pillBase,
        "border-border/50 bg-surface-muted/40 px-1.5 py-0.5 text-[9px] text-muted",
        className
      )}
    >
      {variant === "label" ? `Rank #${rank}` : `#${rank}`}
    </span>
  );
}

interface RankMovementProps {
  rankChange?: number | null;
  movement?: AssetRankMovement | null;
  size?: "xs" | "sm";
  className?: string;
  isNewlyRanked?: boolean;
}

/** Rank movement label for asset detail — plain market language, no arrow glyphs */
export function RankMovement({
  rankChange,
  movement,
  size = "sm",
  className,
  isNewlyRanked = false,
}: RankMovementProps) {
  const textSize = size === "xs" ? "text-[9px]" : "text-[10px]";

  const label = movement
    ? formatRankMovementLabel(movement)
    : isNewlyRanked
      ? "Newly Ranked"
      : formatRankMovementLabel({
          assetId: "",
          rank: 0,
          previousRank: null,
          rankChange: rankChange ?? null,
          price: 0,
          recordedAt: null,
          isNewlyRanked: false,
        });

  const resolvedChange = movement?.rankChange ?? rankChange ?? 0;
  const isStable = label === "Rank Stable";
  const isNew = label === "Newly Ranked" || isNewlyRanked;
  const isUp = !isStable && !isNew && resolvedChange > 0;
  const isDown = !isStable && !isNew && resolvedChange < 0;

  if (isStable) {
    return (
      <span className={cn(textSize, "font-semibold text-muted", className)}>
        Rank Stable
      </span>
    );
  }

  if (isNew) {
    return (
      <span
        className={cn(
          pillBase,
          textSize,
          "border-border/50 bg-surface-muted/40 px-1.5 py-0.5 text-muted",
          className
        )}
      >
        Newly Ranked
      </span>
    );
  }

  return (
    <span
      className={cn(
        pillBase,
        textSize,
        "px-1.5 py-0.5",
        isUp && "border-gain-muted/40 bg-gain-light/40 text-gain",
        isDown && "border-loss-muted/40 bg-loss-light/40 text-loss",
        className
      )}
    >
      {label}
    </span>
  );
}
